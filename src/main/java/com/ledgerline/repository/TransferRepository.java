package com.ledgerline.repository;

import com.ledgerline.model.Transfer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, Long> {
    Optional<Transfer> findByReferenceId(String referenceId);
    Optional<Transfer> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);
    List<Transfer> findAllBySourceAccountIdOrDestinationAccountIdOrderByCreatedAtDesc(Long sourceAccountId, Long destinationAccountId);

    @EntityGraph(attributePaths = {"sourceAccount", "destinationAccount", "sourceAccount.user", "destinationAccount.user"})
    List<Transfer> findAllByOrderByCreatedAtDesc();

    long countByStatus(String status);
}

