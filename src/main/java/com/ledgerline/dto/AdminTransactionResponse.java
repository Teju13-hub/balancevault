package com.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminTransactionResponse {

    private String id;
    private String referenceId;
    private String type;
    private String sourceAccount;
    private String sourceUser;
    private String destinationAccount;
    private String destinationUser;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String description;
    private Instant createdAt;
    private boolean isSuspicious;
    private String suspicionReason;

    public AdminTransactionResponse() {
    }

    public AdminTransactionResponse(
            String id,
            String referenceId,
            String type,
            String sourceAccount,
            String sourceUser,
            String destinationAccount,
            String destinationUser,
            BigDecimal amount,
            String currency,
            String status,
            String description,
            Instant createdAt,
            boolean isSuspicious,
            String suspicionReason) {
        this.id = id;
        this.referenceId = referenceId;
        this.type = type;
        this.sourceAccount = sourceAccount;
        this.sourceUser = sourceUser;
        this.destinationAccount = destinationAccount;
        this.destinationUser = destinationUser;
        this.amount = amount != null ? amount.setScale(4) : BigDecimal.ZERO;
        this.currency = currency != null ? currency : "INR";
        this.status = status;
        this.description = description;
        this.createdAt = createdAt;
        this.isSuspicious = isSuspicious;
        this.suspicionReason = suspicionReason;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSourceAccount() {
        return sourceAccount;
    }

    public void setSourceAccount(String sourceAccount) {
        this.sourceAccount = sourceAccount;
    }

    public String getSourceUser() {
        return sourceUser;
    }

    public void setSourceUser(String sourceUser) {
        this.sourceUser = sourceUser;
    }

    public String getDestinationAccount() {
        return destinationAccount;
    }

    public void setDestinationAccount(String destinationAccount) {
        this.destinationAccount = destinationAccount;
    }

    public String getDestinationUser() {
        return destinationUser;
    }

    public void setDestinationUser(String destinationUser) {
        this.destinationUser = destinationUser;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount != null ? amount.setScale(4) : BigDecimal.ZERO;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isSuspicious() {
        return isSuspicious;
    }

    public void setSuspicious(boolean suspicious) {
        isSuspicious = suspicious;
    }

    public String getSuspicionReason() {
        return suspicionReason;
    }

    public void setSuspicionReason(String suspicionReason) {
        this.suspicionReason = suspicionReason;
    }
}
