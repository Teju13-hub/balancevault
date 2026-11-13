package com.ledgerline.controller;

import com.ledgerline.dto.*;
import com.ledgerline.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final com.ledgerline.service.PasswordResetService passwordResetService;

    public AuthController(AuthService authService, com.ledgerline.service.PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register/initiate")
    public ResponseEntity<OtpInitiateResponse> initiateRegistration(
            @Valid @RequestBody InitiateRegisterRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        OtpInitiateResponse response = authService.initiateRegistration(request, clientIp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register/verify")
    public ResponseEntity<AuthResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        AuthResponse response = authService.verifyOtpAndCompleteRegistration(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/register/resend-otp")
    public ResponseEntity<OtpInitiateResponse> resendOtp(
            @Valid @RequestBody ResendOtpRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        OtpInitiateResponse response = authService.resendOtp(request, clientIp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        AuthResponse response = authService.login(request, clientIp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        MessageResponse response = passwordResetService.requestPasswordReset(request, clientIp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        MessageResponse response = passwordResetService.resetPassword(request, clientIp);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserProfileResponse profile = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        MessageResponse response = authService.changePassword(authentication.getName(), request, clientIp);
        return ResponseEntity.ok(response);
    }
}
