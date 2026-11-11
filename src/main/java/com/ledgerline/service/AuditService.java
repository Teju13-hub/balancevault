package com.ledgerline.service;

import com.ledgerline.model.AuditLog;
import com.ledgerline.model.User;
import com.ledgerline.repository.AuditLogRepository;
import com.ledgerline.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AuditLog logTransferInitiated(Long userId, String referenceId, Long sourceAccountId, Long destinationAccountId, BigDecimal amount, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("Initiated transfer of %s from account %d to account %d",
                    amount != null ? amount.toPlainString() : "unknown",
                    sourceAccountId, destinationAccountId);
            AuditLog audit = new AuditLog(user, "TRANSFER_INITIATED", "TRANSFER", referenceId, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for TRANSFER_INITIATED: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional
    public AuditLog logTransferCompleted(Long userId, String referenceId, Long sourceAccountId, Long destinationAccountId, BigDecimal amount, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("Completed transfer of %s from account %d to account %d",
                    amount != null ? amount.toPlainString() : "unknown",
                    sourceAccountId, destinationAccountId);
            AuditLog audit = new AuditLog(user, "TRANSFER_COMPLETED", "TRANSFER", referenceId, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for TRANSFER_COMPLETED: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logTransferRejected(Long userId, Long sourceAccountId, Long destinationAccountId, BigDecimal amount, String reason, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("Rejected transfer of %s from account %s to account %s. Reason: %s",
                    amount != null ? amount.toPlainString() : "unknown",
                    sourceAccountId != null ? sourceAccountId.toString() : "null",
                    destinationAccountId != null ? destinationAccountId.toString() : "null",
                    reason);
            AuditLog audit = new AuditLog(user, "TRANSFER_REJECTED", "TRANSFER", null, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for TRANSFER_REJECTED: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logTransferFailure(Long userId, String referenceId, Long sourceAccountId, Long destinationAccountId, BigDecimal amount, String errorMessage, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("Failed transfer of %s from account %d to account %d. Error: %s",
                    amount != null ? amount.toPlainString() : "unknown",
                    sourceAccountId, destinationAccountId, errorMessage);
            AuditLog audit = new AuditLog(user, "TRANSFER_FAILED", "TRANSFER", referenceId, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for TRANSFER_FAILED: {}", e.getMessage(), e);
            return null;
        }
    }
}
