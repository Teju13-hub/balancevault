package com.ledgerline.repository;

import com.ledgerline.model.LedgerEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findAllByAccountIdOrderByCreatedAtDesc(Long accountId);

    @EntityGraph(attributePaths = {"account", "account.user"})
    List<LedgerEntry> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.entryType = :entryType")
    BigDecimal sumAmountByEntryType(@Param("entryType") String entryType);

    @Query("SELECT COUNT(l) FROM LedgerEntry l WHERE l.description LIKE '%Deposit%' AND l.entryType = 'CREDIT'")
    long countDeposits();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.description LIKE '%Deposit%' AND l.entryType = 'CREDIT'")
    BigDecimal sumDeposits();

    @Query("SELECT COUNT(l) FROM LedgerEntry l WHERE l.description LIKE '%Withdrawal%' AND l.entryType = 'DEBIT'")
    long countWithdrawals();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.description LIKE '%Withdrawal%' AND l.entryType = 'DEBIT'")
    BigDecimal sumWithdrawals();
}

