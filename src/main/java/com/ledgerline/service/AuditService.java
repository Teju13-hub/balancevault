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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logLoginSuccess(Long userId, String username, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("User %s authenticated successfully", username);
            AuditLog audit = new AuditLog(user, "LOGIN_SUCCESS", "USER", String.valueOf(userId), details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for LOGIN_SUCCESS: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logLoginFailed(String attemptedUsername, String ipAddress) {
        try {
            // Note: Never log passwords or secrets
            String details = String.format("Failed login attempt for username: %s", attemptedUsername);
            AuditLog audit = new AuditLog(null, "LOGIN_FAILED", "USER", attemptedUsername, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for LOGIN_FAILED: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logAccountCreated(Long userId, Long accountId, String accountNumber, String username, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            String details = String.format("Account %s created for user %s", accountNumber, username);
            AuditLog audit = new AuditLog(user, "ACCOUNT_CREATED", "ACCOUNT", String.valueOf(accountId), details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for ACCOUNT_CREATED: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logAdminAction(Long userId, String action, String entityType, String entityId, String details, String ipAddress) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            AuditLog audit = new AuditLog(user, action, entityType, entityId, details, ipAddress);
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log for ADMIN_ACTION: {}", e.getMessage(), e);
            return null;
        }
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
