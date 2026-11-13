package com.ledgerline.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class UserProfileResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private String status = "ACTIVE";
    private Instant createdAt;

    private Boolean isLocked = false;
    private Integer failedLoginAttempts = 0;
    private Instant lockedUntil;
    private Integer accountCount = 0;
    private BigDecimal totalBalance = BigDecimal.ZERO;
    private List<AccountResponse> accounts;

    public UserProfileResponse() {
    }

    public UserProfileResponse(Long id, String username, String email, String fullName, String role, Instant createdAt) {
        this(id, username, email, fullName, role, "ACTIVE", createdAt);
    }

    public UserProfileResponse(Long id, String username, String email, String fullName, String role, String status, Instant createdAt) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName != null && !fullName.trim().isEmpty() ? fullName : username;
        this.role = role;
        this.status = status != null ? status : "ACTIVE";
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName != null && !fullName.trim().isEmpty() ? fullName : username;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
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

    public Boolean getIsLocked() {
        return isLocked;
    }

    public void setIsLocked(Boolean isLocked) {
        this.isLocked = isLocked;
    }

    public Integer getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public void setFailedLoginAttempts(Integer failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public Integer getAccountCount() {
        return accountCount;
    }

    public void setAccountCount(Integer accountCount) {
        this.accountCount = accountCount;
    }

    public BigDecimal getTotalBalance() {
        return totalBalance;
    }

    public void setTotalBalance(BigDecimal totalBalance) {
        this.totalBalance = totalBalance;
    }

    public List<AccountResponse> getAccounts() {
        return accounts;
    }

    public void setAccounts(List<AccountResponse> accounts) {
        this.accounts = accounts;
    }
}
