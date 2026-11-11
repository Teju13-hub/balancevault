package com.ledgerline.controller;

import com.ledgerline.model.User;
import com.ledgerline.repository.UserRepository;
import com.ledgerline.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuditService auditService;
    private final UserRepository userRepository;

    public AdminController(AuditService auditService, UserRepository userRepository) {
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getAdminStatus(
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long userId = userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);

        auditService.logAdminAction(userId, "ADMIN_STATUS_CHECK", "ADMIN", "STATUS",
                "Administrator checked system status", clientIp);

        return ResponseEntity.ok(Map.of("status", "ACTIVE", "role", "ADMIN"));
    }
}
