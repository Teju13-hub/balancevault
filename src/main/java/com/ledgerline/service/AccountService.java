package com.ledgerline.service;

import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.dto.DepositWithdrawRequest;
import com.ledgerline.dto.LedgerEntryResponse;
import com.ledgerline.model.Account;
import com.ledgerline.model.LedgerEntry;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditService auditService;
    private final SecureRandom random = new SecureRandom();

    public AccountService(
            AccountRepository accountRepository,
            UserRepository userRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, String username, String ipAddress) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String accountNumber = generateAccountNumber();
        String currency = (request != null && request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().toUpperCase()
                : "INR";

        Account account = new Account(accountNumber, user, currency, BigDecimal.ZERO.setScale(4));
        Account savedAccount = accountRepository.save(account);

        auditService.logAccountCreated(user.getId(), savedAccount.getId(), savedAccount.getAccountNumber(), user.getUsername(), ipAddress);

        return toResponse(savedAccount);
    }

    public AccountResponse createAccount(CreateAccountRequest request, String username) {
        return createAccount(request, username, "127.0.0.1");
    }

    @Transactional(readOnly = true)
    public java.util.List<AccountResponse> getAccountsForUser(String username) {
        return accountRepository.findAllByUser_Username(username)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long accountId, String username, Collection<? extends GrantedAuthority> authorities) {
        boolean canReadAll = authorities.stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + Role.ADMIN.name()) ||
                a.getAuthority().equals("ROLE_" + Role.AUDITOR.name())
        );

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        // Server-side authorization check:
        // ACCOUNT_HOLDER can only access their own account.
        // Return 404 (not 403) so account existence/IDs are not leaked to unauthorized users.
        if (!canReadAll && !account.getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        }

        return toResponse(account);
    }

    private String generateAccountNumber() {
        String candidate;
        do {
            long number = 1000000000L + (long)(random.nextDouble() * 9000000000L);
            candidate = "AC" + number;
        } while (accountRepository.existsByAccountNumber(candidate));
        return candidate;
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getCurrency(),
                account.getBalance().setScale(4),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public AccountResponse lookupAccount(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        return toResponse(account);
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryResponse> getTransactionsForAccount(Long accountId, String username, Collection<? extends GrantedAuthority> authorities) {
        getAccount(accountId, username, authorities);

        return ledgerEntryRepository.findAllByAccountIdOrderByCreatedAtDesc(accountId)
                .stream()
                .map(e -> new LedgerEntryResponse(
                        e.getId(),
                        e.getAccount().getId(),
                        e.getAccount().getAccountNumber(),
                        e.getEntryType(),
                        e.getAmount().setScale(4),
                        e.getBalanceAfter().setScale(4),
                        e.getDescription(),
                        e.getReferenceId(),
                        e.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(rollbackFor = Exception.class)
    public AccountResponse deposit(Long accountId, DepositWithdrawRequest request, String username, Collection<? extends GrantedAuthority> authorities, String ipAddress) {
        if (request == null || request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Deposit amount must be strictly greater than zero");
        }

        getAccount(accountId, username, authorities);

        Account customerAccount = accountRepository.findByIdWithLock(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        if (!"ACTIVE".equals(customerAccount.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String sysAccNum = customerAccount.getCurrency().equalsIgnoreCase("INR") ? "SYSTEM-CASH-INR" : "SYSTEM-CASH";
        Account systemCash = accountRepository.findByAccountNumber(sysAccNum)
                .orElseGet(() -> accountRepository.findByAccountNumber("SYSTEM-CASH")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "System cash account unavailable")));

        BigDecimal amount = request.getAmount().setScale(4, RoundingMode.HALF_UP);
        BigDecimal newCustomerBalance = customerAccount.getBalance().add(amount).setScale(4);
        customerAccount.setBalance(newCustomerBalance);
        accountRepository.save(customerAccount);

        BigDecimal newSystemBalance = systemCash.getBalance().add(amount).setScale(4);
        systemCash.setBalance(newSystemBalance);
        accountRepository.save(systemCash);

        String refId = "DEP-" + UUID.randomUUID().toString();
        String desc = (request.getDescription() != null && !request.getDescription().isBlank())
                ? request.getDescription().trim()
                : "Customer Funds Deposit";

        // Double-entry record 1: CREDIT customer account
        LedgerEntry customerEntry = new LedgerEntry();
        customerEntry.setAccount(customerAccount);
        customerEntry.setEntryType("CREDIT");
        customerEntry.setAmount(amount);
        customerEntry.setBalanceAfter(newCustomerBalance);
        customerEntry.setDescription(desc);
        customerEntry.setReferenceId(refId);
        ledgerEntryRepository.save(customerEntry);

        // Double-entry record 2: DEBIT system cash account
        LedgerEntry systemEntry = new LedgerEntry();
        systemEntry.setAccount(systemCash);
        systemEntry.setEntryType("DEBIT");
        systemEntry.setAmount(amount);
        systemEntry.setBalanceAfter(newSystemBalance);
        systemEntry.setDescription(desc);
        systemEntry.setReferenceId(refId);
        ledgerEntryRepository.save(systemEntry);

        auditService.logAdminAction(customerAccount.getUser() != null ? customerAccount.getUser().getId() : null,
                "ACCOUNT_DEPOSIT", "ACCOUNT", customerAccount.getAccountNumber(),
                "Deposited " + amount + " " + customerAccount.getCurrency() + " (Ref: " + refId + ")", ipAddress);

        return toResponse(customerAccount);
    }

    @Transactional(rollbackFor = Exception.class)
    public AccountResponse withdraw(Long accountId, DepositWithdrawRequest request, String username, Collection<? extends GrantedAuthority> authorities, String ipAddress) {
        if (request == null || request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Withdrawal amount must be strictly greater than zero");
        }

        getAccount(accountId, username, authorities);

        Account customerAccount = accountRepository.findByIdWithLock(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        if (!"ACTIVE".equals(customerAccount.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        BigDecimal amount = request.getAmount().setScale(4, RoundingMode.HALF_UP);
        if (customerAccount.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Insufficient funds for withdrawal. Available balance: " + customerAccount.getBalance());
        }

        String sysAccNum = customerAccount.getCurrency().equalsIgnoreCase("INR") ? "SYSTEM-CASH-INR" : "SYSTEM-CASH";
        Account systemCash = accountRepository.findByAccountNumber(sysAccNum)
                .orElseGet(() -> accountRepository.findByAccountNumber("SYSTEM-CASH")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "System cash account unavailable")));

        BigDecimal newCustomerBalance = customerAccount.getBalance().subtract(amount).setScale(4);
        customerAccount.setBalance(newCustomerBalance);
        accountRepository.save(customerAccount);

        BigDecimal newSystemBalance = systemCash.getBalance().compareTo(amount) >= 0
                ? systemCash.getBalance().subtract(amount).setScale(4)
                : BigDecimal.ZERO.setScale(4);
        systemCash.setBalance(newSystemBalance);
        accountRepository.save(systemCash);

        String refId = "WTH-" + UUID.randomUUID().toString();
        String desc = (request.getDescription() != null && !request.getDescription().isBlank())
                ? request.getDescription().trim()
                : "Customer Funds Withdrawal";

        // Double-entry record 1: DEBIT customer account
        LedgerEntry customerEntry = new LedgerEntry();
        customerEntry.setAccount(customerAccount);
        customerEntry.setEntryType("DEBIT");
        customerEntry.setAmount(amount);
        customerEntry.setBalanceAfter(newCustomerBalance);
        customerEntry.setDescription(desc);
        customerEntry.setReferenceId(refId);
        ledgerEntryRepository.save(customerEntry);

        // Double-entry record 2: CREDIT system cash account
        LedgerEntry systemEntry = new LedgerEntry();
        systemEntry.setAccount(systemCash);
        systemEntry.setEntryType("CREDIT");
        systemEntry.setAmount(amount);
        systemEntry.setBalanceAfter(newSystemBalance);
        systemEntry.setDescription(desc);
        systemEntry.setReferenceId(refId);
        ledgerEntryRepository.save(systemEntry);

        auditService.logAdminAction(customerAccount.getUser() != null ? customerAccount.getUser().getId() : null,
                "ACCOUNT_WITHDRAWAL", "ACCOUNT", customerAccount.getAccountNumber(),
                "Withdrew " + amount + " " + customerAccount.getCurrency() + " (Ref: " + refId + ")", ipAddress);

        return toResponse(customerAccount);
    }
}
