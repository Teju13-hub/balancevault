package com.ledgerline.service;

import com.ledgerline.dto.ForgotPasswordRequest;
import com.ledgerline.dto.MessageResponse;
import com.ledgerline.dto.ResetPasswordRequest;
import com.ledgerline.model.PasswordResetToken;
import com.ledgerline.model.User;
import com.ledgerline.repository.PasswordResetTokenRepository;
import com.ledgerline.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.regex.Pattern;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    // Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$"
    );

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditService = auditService;
    }

    @Transactional
    public MessageResponse requestPasswordReset(ForgotPasswordRequest request, String clientIp) {
        String genericSuccessMessage = "If an account is associated with this email address, a password reset link has been dispatched.";

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return new MessageResponse(genericSuccessMessage);
        }

        String cleanEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .or(() -> userRepository.findByEmail(cleanEmail))
                .orElse(null);

        // Security rule 9: Generic response regardless of whether user exists
        if (user == null) {
            log.info("[PASSWORD_RESET] Password reset requested for non-existent email (timing-safe generic response).");
            return new MessageResponse(genericSuccessMessage);
        }

        // Invalidate previous tokens for this user
        tokenRepository.invalidateAllActiveForUser(user.getId(), Instant.now());

        // Generate 32 bytes cryptographically secure random token (URL-safe Base64)
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        // Compute SHA-256 hash for database persistence
        String tokenHash = hashSha256(rawToken);

        // 15-minute expiration
        Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);

        PasswordResetToken resetToken = new PasswordResetToken(user, tokenHash, expiresAt, clientIp);
        tokenRepository.save(resetToken);

        // Send email with reset link and token
        String resetUrl = frontendUrl + "/?token=" + rawToken;
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), rawToken, resetUrl);
        } catch (Exception e) {
            log.error("[PASSWORD_RESET] Failed to dispatch password reset email: {}", e.getMessage());
            // Safe generic response
        }

        auditService.logAdminAction(user.getId(), "PASSWORD_RESET_REQUESTED", "SECURITY", user.getUsername(),
                "Password reset token issued (expires in 15 minutes)", clientIp);

        return new MessageResponse(genericSuccessMessage);
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request, String clientIp) {
        if (request.getToken() == null || request.getToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password reset token is required.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password cannot be empty.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password and password confirmation do not match.");
        }

        if (!PASSWORD_PATTERN.matcher(request.getNewPassword()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
        }

        String rawToken = request.getToken().trim();
        String tokenHash = hashSha256(rawToken);

        PasswordResetToken resetToken = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired password reset token."));

        if (resetToken.isUsed()) {
            auditService.logAdminAction(resetToken.getUser().getId(), "PASSWORD_RESET_REPLAY_ATTEMPT", "SECURITY",
                    resetToken.getUser().getUsername(), "Attempted reuse of already consumed password reset token", clientIp);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This password reset token has already been used.");
        }

        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            auditService.logAdminAction(resetToken.getUser().getId(), "PASSWORD_RESET_EXPIRED_TOKEN", "SECURITY",
                    resetToken.getUser().getUsername(), "Attempted use of expired password reset token", clientIp);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This password reset token has expired. Please request a new one.");
        }

        User user = resetToken.getUser();

        // Update password with BCrypt hash
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLocked(false);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        resetToken.setUsedAt(Instant.now());
        tokenRepository.save(resetToken);

        // Invalidate any other active tokens for this user
        tokenRepository.invalidateAllActiveForUser(user.getId(), Instant.now());

        auditService.logAdminAction(user.getId(), "PASSWORD_RESET_SUCCESS", "SECURITY", user.getUsername(),
                "Customer successfully reset their password", clientIp);

        return new MessageResponse("Password has been reset successfully. You may now sign in with your new password.");
    }

    public String hashSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}

