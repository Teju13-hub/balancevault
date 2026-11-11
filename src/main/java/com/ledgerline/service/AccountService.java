package com.ledgerline.service;

import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.model.Account;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Collection;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final SecureRandom random = new SecureRandom();

    public AccountService(AccountRepository accountRepository, UserRepository userRepository, AuditService auditService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, String username, String ipAddress) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String accountNumber = generateAccountNumber();
        String currency = (request != null && request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().toUpperCase()
                : "USD";

        Account account = new Account(accountNumber, user, currency, BigDecimal.ZERO.setScale(4));
        Account savedAccount = accountRepository.save(account);

        auditService.logAccountCreated(user.getId(), savedAccount.getId(), savedAccount.getAccountNumber(), user.getUsername(), ipAddress);

        return toResponse(savedAccount);
    }

    public AccountResponse createAccount(CreateAccountRequest request, String username) {
        return createAccount(request, username, "127.0.0.1");
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
}
