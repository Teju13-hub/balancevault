package com.ledgerline.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AdminOverviewResponse {

    private long totalCustomers;
    private long activeUsers;
    private long suspendedUsers;
    private long lockedUsers;
    private long totalAccounts;
    private long activeAccounts;
    private long frozenAccounts;

    private long totalDepositsCount;
    private BigDecimal totalDepositsVolume;
    private long totalWithdrawalsCount;
    private BigDecimal totalWithdrawalsVolume;
    private long totalTransfersCount;
    private BigDecimal totalTransfersVolume;
    private BigDecimal totalVolume;

    private String systemHealth;
    private String activeVaultEngine;

    private List<AdminTransactionResponse> recentTransactions;
    private List<UserProfileResponse> recentRegistrations;
    private List<Map<String, Object>> activityOverTime;
    private List<Map<String, Object>> typeDistribution;
    private List<Map<String, Object>> customerGrowth;

    public AdminOverviewResponse() {
    }

    public long getTotalCustomers() {
        return totalCustomers;
    }

    public void setTotalCustomers(long totalCustomers) {
        this.totalCustomers = totalCustomers;
    }

    public long getActiveUsers() {
        return activeUsers;
    }

    public void setActiveUsers(long activeUsers) {
        this.activeUsers = activeUsers;
    }

    public long getSuspendedUsers() {
        return suspendedUsers;
    }

    public void setSuspendedUsers(long suspendedUsers) {
        this.suspendedUsers = suspendedUsers;
    }

    public long getLockedUsers() {
        return lockedUsers;
    }

    public void setLockedUsers(long lockedUsers) {
        this.lockedUsers = lockedUsers;
    }

    public long getTotalAccounts() {
        return totalAccounts;
    }

    public void setTotalAccounts(long totalAccounts) {
        this.totalAccounts = totalAccounts;
    }

    public long getActiveAccounts() {
        return activeAccounts;
    }

    public void setActiveAccounts(long activeAccounts) {
        this.activeAccounts = activeAccounts;
    }

    public long getFrozenAccounts() {
        return frozenAccounts;
    }

    public void setFrozenAccounts(long frozenAccounts) {
        this.frozenAccounts = frozenAccounts;
    }

    public long getTotalDepositsCount() {
        return totalDepositsCount;
    }

    public void setTotalDepositsCount(long totalDepositsCount) {
        this.totalDepositsCount = totalDepositsCount;
    }

    public BigDecimal getTotalDepositsVolume() {
        return totalDepositsVolume;
    }

    public void setTotalDepositsVolume(BigDecimal totalDepositsVolume) {
        this.totalDepositsVolume = totalDepositsVolume;
    }

    public long getTotalWithdrawalsCount() {
        return totalWithdrawalsCount;
    }

    public void setTotalWithdrawalsCount(long totalWithdrawalsCount) {
        this.totalWithdrawalsCount = totalWithdrawalsCount;
    }

    public BigDecimal getTotalWithdrawalsVolume() {
        return totalWithdrawalsVolume;
    }

    public void setTotalWithdrawalsVolume(BigDecimal totalWithdrawalsVolume) {
        this.totalWithdrawalsVolume = totalWithdrawalsVolume;
    }

    public long getTotalTransfersCount() {
        return totalTransfersCount;
    }

    public void setTotalTransfersCount(long totalTransfersCount) {
        this.totalTransfersCount = totalTransfersCount;
    }

    public BigDecimal getTotalTransfersVolume() {
        return totalTransfersVolume;
    }

    public void setTotalTransfersVolume(BigDecimal totalTransfersVolume) {
        this.totalTransfersVolume = totalTransfersVolume;
    }

    public BigDecimal getTotalVolume() {
        return totalVolume;
    }

    public void setTotalVolume(BigDecimal totalVolume) {
        this.totalVolume = totalVolume;
    }

    public String getSystemHealth() {
        return systemHealth;
    }

    public void setSystemHealth(String systemHealth) {
        this.systemHealth = systemHealth;
    }

    public String getActiveVaultEngine() {
        return activeVaultEngine;
    }

    public void setActiveVaultEngine(String activeVaultEngine) {
        this.activeVaultEngine = activeVaultEngine;
    }

    public List<AdminTransactionResponse> getRecentTransactions() {
        return recentTransactions;
    }

    public void setRecentTransactions(List<AdminTransactionResponse> recentTransactions) {
        this.recentTransactions = recentTransactions;
    }

    public List<UserProfileResponse> getRecentRegistrations() {
        return recentRegistrations;
    }

    public void setRecentRegistrations(List<UserProfileResponse> recentRegistrations) {
        this.recentRegistrations = recentRegistrations;
    }

    public List<Map<String, Object>> getActivityOverTime() {
        return activityOverTime;
    }

    public void setActivityOverTime(List<Map<String, Object>> activityOverTime) {
        this.activityOverTime = activityOverTime;
    }

    public List<Map<String, Object>> getTypeDistribution() {
        return typeDistribution;
    }

    public void setTypeDistribution(List<Map<String, Object>> typeDistribution) {
        this.typeDistribution = typeDistribution;
    }

    public List<Map<String, Object>> getCustomerGrowth() {
        return customerGrowth;
    }

    public void setCustomerGrowth(List<Map<String, Object>> customerGrowth) {
        this.customerGrowth = customerGrowth;
    }
}

