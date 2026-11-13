package com.ledgerline.repository;

import com.ledgerline.model.AuditLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    @EntityGraph(attributePaths = {"user"})
    List<AuditLog> findAllByOrderByCreatedAtDesc();
    @EntityGraph(attributePaths = {"user"})
    List<AuditLog> findTop50ByOrderByCreatedAtDesc();
    @EntityGraph(attributePaths = {"user"})
    List<AuditLog> findAllByActionInOrderByCreatedAtDesc(List<String> actions);
    List<AuditLog> findAllByActionOrderByCreatedAtDesc(String action);
    List<AuditLog> findAllByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
}

