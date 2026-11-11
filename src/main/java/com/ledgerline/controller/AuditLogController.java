package com.ledgerline.controller;

import com.ledgerline.dto.AuditLogResponse;
import com.ledgerline.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller exposing audit records to authorized security personnel.
 * Strictly limited to ADMIN and AUDITOR roles.
 */
@RestController
@RequestMapping("/api/v1/audit-logs")
@PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR')")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs() {
        List<AuditLogResponse> logs = auditLogRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getUser() != null ? log.getUser().getUsername() : null,
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getDetails(),
                        log.getIpAddress(),
                        log.getCreatedAt()
                ))
                .toList();

        return ResponseEntity.ok(logs);
    }
}

