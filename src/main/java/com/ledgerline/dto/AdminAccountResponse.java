package com.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminAccountResponse {

    private Long id;
    private String accountNumber;
    private Long userId;
    private String username;
    private String customerName;
    private String customerEmail;
    private String currency;
    private BigDecimal balance;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean isSystemAccount;

    public AdminAccountResponse() {
    }

    public AdminAccountResponse(
            Long id,
            String accountNumber,
            Long userId,
            String username,
            String customerName,
            String customerEmail,
            String currency,
            BigDecimal balance,
            String status,
            Instant createdAt,
            Instant updatedAt,
            boolean isSystemAccount) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.userId = userId;
        this.username = username;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.currency = currency;
        this.balance = balance != null ? balance.setScale(4) : BigDecimal.ZERO;
        this.status = status != null ? status : "ACTIVE";
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.isSystemAccount = isSystemAccount;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance != null ? balance.setScale(4) : BigDecimal.ZERO;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isSystemAccount() {
        return isSystemAccount;
    }

    public void setSystemAccount(boolean systemAccount) {
        isSystemAccount = systemAccount;
    }
}

