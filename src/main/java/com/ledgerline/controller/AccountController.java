package com.ledgerline.controller;

import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ACCOUNT_HOLDER') or hasRole('ADMIN')")
    public ResponseEntity<AccountResponse> createAccount(
            @RequestBody(required = false) CreateAccountRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        AccountResponse response = accountService.createAccount(request, authentication.getName(), clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccount(
            @PathVariable Long id,
            Authentication authentication) {
        AccountResponse response = accountService.getAccount(
                id,
                authentication.getName(),
                authentication.getAuthorities()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/balance")
    public ResponseEntity<Map<String, Object>> getAccountBalance(
            @PathVariable Long id,
            Authentication authentication) {
        AccountResponse account = accountService.getAccount(
                id,
                authentication.getName(),
                authentication.getAuthorities()
        );

        Map<String, Object> balanceResponse = Map.of(
                "accountId", account.getId(),
                "accountNumber", account.getAccountNumber(),
                "currency", account.getCurrency(),
                "balance", account.getBalance()
        );
        return ResponseEntity.ok(balanceResponse);
    }
}
