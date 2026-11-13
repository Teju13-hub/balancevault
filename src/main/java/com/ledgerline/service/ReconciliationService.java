package com.ledgerline.service;

import com.ledgerline.model.Account;
import com.ledgerline.model.LedgerEntry;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class ReconciliationService {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;

    public ReconciliationService(LedgerEntryRepository ledgerEntryRepository, AccountRepository accountRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.accountRepository = accountRepository;
    }

    public static class ReconciliationReport {
        private String status;
        private BigDecimal totalDebits;
        private BigDecimal totalCredits;
        private BigDecimal variance;
        private long totalAccounts;
        private long verifiedAccounts;
        private int discrepancyCount;
        private List<String> discrepancies;
        private Instant timestamp;

        public ReconciliationReport(
                String status,
                BigDecimal totalDebits,
                BigDecimal totalCredits,
                BigDecimal variance,
                long totalAccounts,
                long verifiedAccounts,
                int discrepancyCount,
                List<String> discrepancies,
                Instant timestamp) {
            this.status = status;
            this.totalDebits = totalDebits;
            this.totalCredits = totalCredits;
            this.variance = variance;
            this.totalAccounts = totalAccounts;
            this.verifiedAccounts = verifiedAccounts;
            this.discrepancyCount = discrepancyCount;
            this.discrepancies = discrepancies;
            this.timestamp = timestamp;
        }

        public String getStatus() { return status; }
        public BigDecimal getTotalDebits() { return totalDebits; }
        public BigDecimal getTotalCredits() { return totalCredits; }
        public BigDecimal getVariance() { return variance; }
        public long getTotalAccounts() { return totalAccounts; }
        public long getVerifiedAccounts() { return verifiedAccounts; }
        public int getDiscrepancyCount() { return discrepancyCount; }
        public List<String> getDiscrepancies() { return discrepancies; }
        public Instant getTimestamp() { return timestamp; }
    }

    @Transactional(readOnly = true)
    public ReconciliationReport performReconciliation() {
        BigDecimal totalDebits = ledgerEntryRepository.sumAmountByEntryType("DEBIT").setScale(4);
        BigDecimal totalCredits = ledgerEntryRepository.sumAmountByEntryType("CREDIT").setScale(4);
        BigDecimal variance = totalDebits.subtract(totalCredits).abs().setScale(4);

        List<Account> allAccounts = accountRepository.findAll();
        List<String> discrepancies = new ArrayList<>();
        long verifiedCount = 0;

        for (Account account : allAccounts) {
            List<LedgerEntry> entries = ledgerEntryRepository.findAllByAccountIdOrderByCreatedAtDesc(account.getId());
            if (entries.isEmpty()) {
                // If account has 0 ledger entries, its balance should be 0
                if (account.getBalance().compareTo(BigDecimal.ZERO) == 0) {
                    verifiedCount++;
                } else {
                    discrepancies.add("Account " + account.getAccountNumber() + " has non-zero balance without ledger entries: " + account.getBalance());
                }
            } else {
                // Latest ledger entry balance_after should match account.balance
                LedgerEntry latestEntry = entries.get(0);
                if (latestEntry.getBalanceAfter().compareTo(account.getBalance()) == 0) {
                    verifiedCount++;
                } else {
                    discrepancies.add("Account " + account.getAccountNumber() + " balance (" + account.getBalance() +
                            ") does not match latest ledger balance_after (" + latestEntry.getBalanceAfter() + ")");
                }
            }
        }

        boolean isBalanced = variance.compareTo(BigDecimal.ZERO) == 0 && discrepancies.isEmpty();
        String status = isBalanced ? "BALANCED" : "VARIANCE_DETECTED";

        return new ReconciliationReport(
                status,
                totalDebits,
                totalCredits,
                variance,
                allAccounts.size(),
                verifiedCount,
                discrepancies.size(),
                discrepancies,
                Instant.now()
        );
    }
}

