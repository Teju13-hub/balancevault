package com.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class LedgerEntryResponse {
    private Long id;
    private Long accountId;
    private String accountNumber;
    private String entryType;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String description;
    private String referenceId;
    private Instant createdAt;

    public LedgerEntryResponse() {
    }

    public LedgerEntryResponse(
            Long id,
            Long accountId,
            String accountNumber,
            String entryType,
            BigDecimal amount,
            BigDecimal balanceAfter,
            String description,
            String referenceId,
            Instant createdAt) {
        this.id = id;
        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.entryType = entryType;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.description = description;
        this.referenceId = referenceId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getEntryType() {
        return entryType;
    }

    public void setEntryType(String entryType) {
        this.entryType = entryType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(BigDecimal balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
