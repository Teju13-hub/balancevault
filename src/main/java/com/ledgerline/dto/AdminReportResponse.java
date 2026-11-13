package com.ledgerline.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AdminReportResponse {

    private String period;
    private String startDate;
    private String endDate;
    private long totalDepositsCount;
    private BigDecimal totalDepositsVolume;
    private long totalWithdrawalsCount;
    private BigDecimal totalWithdrawalsVolume;
    private long totalTransfersCount;
    private BigDecimal totalTransfersVolume;
    private BigDecimal netVolume;
    private long newRegistrations;
    private Map<String, BigDecimal> currencyBreakdown;
    private List<Map<String, Object>> dailySummaries;

    public AdminReportResponse() {
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
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

    public BigDecimal getNetVolume() {
        return netVolume;
    }

    public void setNetVolume(BigDecimal netVolume) {
        this.netVolume = netVolume;
    }

    public long getNewRegistrations() {
        return newRegistrations;
    }

    public void setNewRegistrations(long newRegistrations) {
        this.newRegistrations = newRegistrations;
    }

    public Map<String, BigDecimal> getCurrencyBreakdown() {
        return currencyBreakdown;
    }

    public void setCurrencyBreakdown(Map<String, BigDecimal> currencyBreakdown) {
        this.currencyBreakdown = currencyBreakdown;
    }

    public List<Map<String, Object>> getDailySummaries() {
        return dailySummaries;
    }

    public void setDailySummaries(List<Map<String, Object>> dailySummaries) {
        this.dailySummaries = dailySummaries;
    }
}

