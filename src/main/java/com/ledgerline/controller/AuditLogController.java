package com.ledgerline.controller;

import com.ledgerline.dto.AuditLogResponse;
import com.ledgerline.model.AuditLog;
import com.ledgerline.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
    @Transactional(readOnly = true)
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        List<AuditLog> rawLogs = auditLogRepository.findAllByOrderByCreatedAtDesc();

        String s = search != null ? search.trim().toLowerCase() : "";

        Instant startInstant = null;
        Instant endInstant = null;
        if (startDate != null && !startDate.isBlank()) {
            try {
                startInstant = LocalDate.parse(startDate).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (Exception ignored) {}
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                endInstant = LocalDate.parse(endDate).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (Exception ignored) {}
        }

        final Instant fStart = startInstant;
        final Instant fEnd = endInstant;

        List<AuditLogResponse> logs = rawLogs.stream()
                .filter(log -> {
                    if (!s.isEmpty()) {
                        boolean matchAction = log.getAction().toLowerCase().contains(s);
                        boolean matchUser = log.getUser() != null && log.getUser().getUsername().toLowerCase().contains(s);
                        boolean matchEntity = log.getEntityType().toLowerCase().contains(s) || (log.getEntityId() != null && log.getEntityId().toLowerCase().contains(s));
                        boolean matchDetails = log.getDetails() != null && log.getDetails().toLowerCase().contains(s);
                        boolean matchIp = log.getIpAddress() != null && log.getIpAddress().contains(s);
                        if (!matchAction && !matchUser && !matchEntity && !matchDetails && !matchIp) return false;
                    }
                    if (action != null && !action.equalsIgnoreCase("ALL") && !log.getAction().equalsIgnoreCase(action)) {
                        return false;
                    }
                    if (entityType != null && !entityType.equalsIgnoreCase("ALL") && !log.getEntityType().equalsIgnoreCase(entityType)) {
                        return false;
                    }
                    if (fStart != null && log.getCreatedAt().isBefore(fStart)) {
                        return false;
                    }
                    if (fEnd != null && log.getCreatedAt().isAfter(fEnd)) {
                        return false;
                    }
                    return true;
                })
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
