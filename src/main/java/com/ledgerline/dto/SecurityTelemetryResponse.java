package com.ledgerline.dto;

import java.util.List;
import java.util.Map;

public class SecurityTelemetryResponse {

    private long totalFailedAttempts;
    private long lockedAccountsCount;
    private String bruteForceDefenseStatus;
    private List<Map<String, Object>> failedLoginUsers;
    private List<Map<String, Object>> lockedUsers;
    private List<AuditLogResponse> recentAuthEvents;
    private List<AdminTransactionResponse> suspiciousTransactions;
    private Map<String, Object> securitySummary;

    public SecurityTelemetryResponse() {
    }

    public long getTotalFailedAttempts() {
        return totalFailedAttempts;
    }

    public void setTotalFailedAttempts(long totalFailedAttempts) {
        this.totalFailedAttempts = totalFailedAttempts;
    }

    public long getLockedAccountsCount() {
        return lockedAccountsCount;
    }

    public void setLockedAccountsCount(long lockedAccountsCount) {
        this.lockedAccountsCount = lockedAccountsCount;
    }

    public String getBruteForceDefenseStatus() {
        return bruteForceDefenseStatus;
    }

    public void setBruteForceDefenseStatus(String bruteForceDefenseStatus) {
        this.bruteForceDefenseStatus = bruteForceDefenseStatus;
    }

    public List<Map<String, Object>> getFailedLoginUsers() {
        return failedLoginUsers;
    }

    public void setFailedLoginUsers(List<Map<String, Object>> failedLoginUsers) {
        this.failedLoginUsers = failedLoginUsers;
    }

    public List<Map<String, Object>> getLockedUsers() {
        return lockedUsers;
    }

    public void setLockedUsers(List<Map<String, Object>> lockedUsers) {
        this.lockedUsers = lockedUsers;
    }

    public List<AuditLogResponse> getRecentAuthEvents() {
        return recentAuthEvents;
    }

    public void setRecentAuthEvents(List<AuditLogResponse> recentAuthEvents) {
        this.recentAuthEvents = recentAuthEvents;
    }

    public List<AdminTransactionResponse> getSuspiciousTransactions() {
        return suspiciousTransactions;
    }

    public void setSuspiciousTransactions(List<AdminTransactionResponse> suspiciousTransactions) {
        this.suspiciousTransactions = suspiciousTransactions;
    }

    public Map<String, Object> getSecuritySummary() {
        return securitySummary;
    }

    public void setSecuritySummary(Map<String, Object> securitySummary) {
        this.securitySummary = securitySummary;
    }
}

