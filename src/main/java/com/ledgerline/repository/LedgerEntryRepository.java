package com.ledgerline.repository;

import com.ledgerline.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findAllByAccountIdOrderByCreatedAtDesc(Long accountId);
}

