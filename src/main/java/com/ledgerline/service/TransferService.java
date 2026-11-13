package com.ledgerline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.CreateTransferRequest;
import com.ledgerline.dto.TransferResponse;
import com.ledgerline.model.*;
import com.ledgerline.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferService {

    private final TransferRepository transferRepository;
    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public static class TransferExecutionResult {
        private final TransferResponse response;
        private final boolean replay;

        public TransferExecutionResult(TransferResponse response, boolean replay) {
            this.response = response;
            this.replay = replay;
        }

        public TransferResponse getResponse() {
            return response;
        }

        public boolean isReplay() {
            return replay;
        }
    }

    public TransferService(
            TransferRepository transferRepository,
            AccountRepository accountRepository,
            LedgerEntryRepository ledgerEntryRepository,
            IdempotencyRecordRepository idempotencyRecordRepository,
            UserRepository userRepository,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.transferRepository = transferRepository;
        this.accountRepository = accountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(rollbackFor = Exception.class)
    public TransferExecutionResult executeTransfer(
            CreateTransferRequest request,
            String rawIdempotencyKey,
            String username,
            Collection<? extends GrantedAuthority> authorities,
            String ipAddress) {

        String idempotencyKey = (rawIdempotencyKey != null && !rawIdempotencyKey.trim().isEmpty())
                ? rawIdempotencyKey.trim()
                : null;

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // 1. Basic Request Validation
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer request cannot be empty");
        }

        if (request.getSourceAccountId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source account ID is required");
        }

        if (request.getDestinationAccountId() == null) {
            if (request.getDestinationAccountNumber() != null && !request.getDestinationAccountNumber().isBlank()) {
                Account destAcc = accountRepository.findByAccountNumber(request.getDestinationAccountNumber().trim())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Destination account not found: " + request.getDestinationAccountNumber()));
                request.setDestinationAccountId(destAcc.getId());
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Destination account ID or account number is required");
            }
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            auditService.logTransferRejected(user.getId(), request.getSourceAccountId(), request.getDestinationAccountId(),
                    request.getAmount(), "Transfer amount must be strictly greater than zero", ipAddress);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer amount must be strictly greater than zero");
        }

        if (request.getSourceAccountId().equals(request.getDestinationAccountId())) {
            auditService.logTransferRejected(user.getId(), request.getSourceAccountId(), request.getDestinationAccountId(),
                    request.getAmount(), "Source and destination accounts must be different", ipAddress);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination accounts must be different");
        }

        String requestHash = computeRequestHash(request);

        // 2. Idempotency Check
        if (idempotencyKey != null) {
            Optional<IdempotencyRecord> optRecord = idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey);
            if (optRecord.isPresent()) {
                IdempotencyRecord record = optRecord.get();
                if (!record.getRequestHash().equals(requestHash)) {
                    auditService.logTransferRejected(user.getId(), request.getSourceAccountId(), request.getDestinationAccountId(),
                            request.getAmount(), "Idempotency key payload mismatch", ipAddress);
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Idempotency key conflict: request payload differs from previous request with the same key");
                }

                if ("COMPLETED".equals(record.getStatus())) {
                    Transfer existingTransfer = transferRepository.findByIdempotencyKey(idempotencyKey)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                                    "Transfer record missing for completed idempotency key"));
                    return new TransferExecutionResult(toResponse(existingTransfer), true);
                } else if ("IN_PROGRESS".equals(record.getStatus())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Transfer request with this idempotency key is already in progress");
                } else {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Prior transfer with this idempotency key failed");
                }
            }
        }

        // 3. Role-Based Access Control: AUDITOR and non-account holders cannot initiate transfers
        boolean isAuditor = authorities != null && authorities.stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + Role.AUDITOR.name())
        );

        boolean isAccountHolder = authorities != null && authorities.stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + Role.ACCOUNT_HOLDER.name())
        );

        if (isAuditor || !isAccountHolder) {
            auditService.logTransferRejected(user.getId(), request.getSourceAccountId(), request.getDestinationAccountId(),
                    request.getAmount(), "Auditor or non-account holder denied transfer initiation", ipAddress);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Auditors and non-account holders cannot initiate transfers");
        }

        // 4. Concurrency Safety: Pessimistic Row Locking in Ascending Account ID Order
        Long sourceId = request.getSourceAccountId();
        Long destId = request.getDestinationAccountId();

        Long firstId = Math.min(sourceId, destId);
        Long secondId = Math.max(sourceId, destId);

        Account firstAccount = accountRepository.findByIdWithLock(firstId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found: " + firstId));

        Account secondAccount = accountRepository.findByIdWithLock(secondId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found: " + secondId));

        Account sourceAccount = sourceId.equals(firstId) ? firstAccount : secondAccount;
        Account destinationAccount = destId.equals(firstId) ? firstAccount : secondAccount;

        // 4. Server-Side Account Ownership Authorization
        if (!sourceAccount.getUser().getUsername().equals(username)) {
            auditService.logTransferRejected(user.getId(), sourceId, destId, request.getAmount(),
                    "Caller does not own source account", ipAddress);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You do not own the source account");
        }

        // 5. Currency Validation
        String currency = (request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().trim().toUpperCase()
                : sourceAccount.getCurrency();

        if (!sourceAccount.getCurrency().equalsIgnoreCase(currency)) {
            auditService.logTransferRejected(user.getId(), sourceId, destId, request.getAmount(),
                    "Source account currency does not match transfer currency", ipAddress);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Source account currency does not match transfer currency");
        }

        if (!destinationAccount.getCurrency().equalsIgnoreCase(currency)) {
            auditService.logTransferRejected(user.getId(), sourceId, destId, request.getAmount(),
                    "Cross-currency transfers are not supported", ipAddress);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Cross-currency transfers are not supported");
        }

        // 6. Overdraft Prevention (Available Balance Check)
        BigDecimal transferAmount = request.getAmount().setScale(4, RoundingMode.HALF_UP);
        if (sourceAccount.getBalance().compareTo(transferAmount) < 0) {
            auditService.logTransferRejected(user.getId(), sourceId, destId, transferAmount,
                    "Insufficient funds in source account", ipAddress);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Insufficient funds in source account");
        }

        // 7. Audit: Transfer Initiated
        String referenceId = "TRF-" + UUID.randomUUID().toString();
        auditService.logTransferInitiated(user.getId(), referenceId, sourceId, destId, transferAmount, ipAddress);

        // 8. Update Account Balances
        BigDecimal newSourceBalance = sourceAccount.getBalance().subtract(transferAmount).setScale(4, RoundingMode.HALF_UP);
        BigDecimal newDestBalance = destinationAccount.getBalance().add(transferAmount).setScale(4, RoundingMode.HALF_UP);

        sourceAccount.setBalance(newSourceBalance);
        destinationAccount.setBalance(newDestBalance);

        accountRepository.save(sourceAccount);
        accountRepository.save(destinationAccount);

        // 9. Create Exactly Two Corresponding Ledger Entries (Double-Entry Accounting)
        // DEBIT entry for source account
        LedgerEntry debitEntry = new LedgerEntry();
        debitEntry.setAccount(sourceAccount);
        debitEntry.setEntryType("DEBIT");
        debitEntry.setAmount(transferAmount);
        debitEntry.setBalanceAfter(newSourceBalance);
        debitEntry.setDescription(request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription()
                : "Transfer to " + destinationAccount.getAccountNumber());
        debitEntry.setReferenceId(referenceId);
        ledgerEntryRepository.save(debitEntry);

        // CREDIT entry for destination account
        LedgerEntry creditEntry = new LedgerEntry();
        creditEntry.setAccount(destinationAccount);
        creditEntry.setEntryType("CREDIT");
        creditEntry.setAmount(transferAmount);
        creditEntry.setBalanceAfter(newDestBalance);
        creditEntry.setDescription(request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription()
                : "Transfer from " + sourceAccount.getAccountNumber());
        creditEntry.setReferenceId(referenceId);
        ledgerEntryRepository.save(creditEntry);

        // 10. Create One Transfer Record
        Transfer transfer = new Transfer(
                referenceId,
                sourceAccount,
                destinationAccount,
                transferAmount,
                currency,
                "COMPLETED",
                request.getDescription(),
                idempotencyKey
        );
        transfer.setCompletedAt(Instant.now());
        Transfer savedTransfer = transferRepository.save(transfer);

        // 11. Atomic Idempotency Record Storage
        if (idempotencyKey != null) {
            TransferResponse responseDto = toResponse(savedTransfer);
            String responseJson;
            try {
                responseJson = objectMapper.writeValueAsString(responseDto);
            } catch (JsonProcessingException e) {
                responseJson = "{}";
            }

            IdempotencyRecord record = new IdempotencyRecord(idempotencyKey, user, "/api/v1/transfers", requestHash);
            record.setStatus("COMPLETED");
            record.setResponseStatusCode(HttpStatus.CREATED.value());
            record.setResponseBody(responseJson);
            idempotencyRecordRepository.save(record);
        }

        // 12. Audit: Transfer Completed
        auditService.logTransferCompleted(user.getId(), referenceId, sourceId, destId, transferAmount, ipAddress);

        return new TransferExecutionResult(toResponse(savedTransfer), false);
    }

    @Transactional(readOnly = true)
    public TransferResponse getTransfer(Long id, String username, Collection<? extends GrantedAuthority> authorities) {
        boolean canReadAll = authorities != null && authorities.stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + Role.ADMIN.name()) ||
                a.getAuthority().equals("ROLE_" + Role.AUDITOR.name())
        );

        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found"));

        boolean isParticipant = transfer.getSourceAccount().getUser().getUsername().equals(username) ||
                                transfer.getDestinationAccount().getUser().getUsername().equals(username);

        // Server-side authorization check:
        // Do not expose transfer details or IDs to unauthorized third parties.
        if (!canReadAll && !isParticipant) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found");
        }

        return toResponse(transfer);
    }

    @Transactional(readOnly = true)
    public Optional<TransferResponse> getTransferByIdempotencyKey(String idempotencyKey) {
        return transferRepository.findByIdempotencyKey(idempotencyKey).map(this::toResponse);
    }

    public String computeRequestHash(CreateTransferRequest req) {
        if (req == null) return "";
        String amountStr = req.getAmount() != null
                ? req.getAmount().setScale(4, RoundingMode.HALF_UP).toPlainString()
                : "";
        String currencyStr = (req.getCurrency() != null && !req.getCurrency().isBlank())
                ? req.getCurrency().trim().toUpperCase()
                : "USD";
        String raw = req.getSourceAccountId() + "|" + req.getDestinationAccountId() + "|" + amountStr + "|" + currencyStr;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public TransferResponse toResponse(Transfer transfer) {
        return new TransferResponse(
                transfer.getId(),
                transfer.getReferenceId(),
                transfer.getSourceAccount().getId(),
                transfer.getDestinationAccount().getId(),
                transfer.getAmount().setScale(4),
                transfer.getCurrency(),
                transfer.getStatus(),
                transfer.getDescription(),
                transfer.getIdempotencyKey(),
                transfer.getCreatedAt(),
                transfer.getCompletedAt()
        );
    }
}
