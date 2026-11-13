package com.ledgerline.service;

import com.ledgerline.dto.*;
import com.ledgerline.model.Account;
import com.ledgerline.model.EmailVerification;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.EmailVerificationRepository;
import com.ledgerline.repository.UserRepository;
import com.ledgerline.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            AccountRepository accountRepository,
            EmailVerificationRepository emailVerificationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuditService auditService,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.emailService = emailService;
    }

    @Transactional
    public OtpInitiateResponse initiateRegistration(InitiateRegisterRequest request, String ipAddress) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is required");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }

        String email = request.getEmail().trim().toLowerCase();
        String username = request.getUsername().trim();

        // 1. Check existing verified users
        if (userRepository.existsByEmailIgnoreCase(email) || userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active account with this email address already exists");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This username is already taken");
        }

        // 2. Generate cryptographically secure 6-digit numeric OTP
        int otpNumber = 100000 + random.nextInt(900000);
        String otp = String.valueOf(otpNumber);

        // 3. Hash OTP securely using BCrypt before persistence
        String otpHash = passwordEncoder.encode(otp);
        String passwordHash = passwordEncoder.encode(request.getPassword());
        String fullName = request.getFullName() != null && !request.getFullName().trim().isEmpty()
                ? request.getFullName().trim()
                : username;

        // 4. Rate-limit & cooldown: 60s cooldown, 10 minutes expiry
        Instant now = Instant.now();
        Instant resendAvailableAt = now.plus(60, ChronoUnit.SECONDS);
        Instant expiresAt = now.plus(10, ChronoUnit.MINUTES);

        // 5. Store pending verification record
        EmailVerification verification = emailVerificationRepository.findByEmailIgnoreCase(email)
                .orElse(new EmailVerification());

        verification.setEmail(email);
        verification.setUsername(username);
        verification.setFullName(fullName);
        verification.setPasswordHash(passwordHash);
        verification.setOtpHash(otpHash);
        verification.setAttemptsLeft(5);
        verification.setResendAvailableAt(resendAvailableAt);
        verification.setExpiresAt(expiresAt);

        emailVerificationRepository.save(verification);

        // 6. Send OTP Email through configured SMTP provider
        emailService.sendRegistrationOtp(email, fullName, otp);

        auditService.logAdminAction(null, "REGISTRATION_OTP_INITIATED", "USER_ONBOARDING", email,
                "Verification code dispatched to customer email address", ipAddress);

        return new OtpInitiateResponse(
                "OTP_SENT",
                "A 6-digit verification code has been dispatched to your email address.",
                email,
                600,
                60
        );
    }

    @Transactional
    public AuthResponse verifyOtpAndCompleteRegistration(VerifyOtpRequest request, String ipAddress) {
        String email = request.getEmail().trim().toLowerCase();
        String submittedOtp = request.getOtp().trim();

        EmailVerification verification = emailVerificationRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending registration found for this email. Please initiate registration."));

        Instant now = Instant.now();

        // 1. Expiry Check
        if (now.isAfter(verification.getExpiresAt())) {
            emailVerificationRepository.delete(verification);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired. Please request a new verification code.");
        }

        // 2. Maximum Attempts Enforcement
        if (verification.getAttemptsLeft() <= 0) {
            emailVerificationRepository.delete(verification);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum verification attempts exceeded. Please restart registration.");
        }

        // 3. Cryptographic Verification
        if (!passwordEncoder.matches(submittedOtp, verification.getOtpHash())) {
            verification.setAttemptsLeft(verification.getAttemptsLeft() - 1);
            emailVerificationRepository.save(verification);
            auditService.logAdminAction(null, "REGISTRATION_OTP_FAILED", "USER_ONBOARDING", email,
                    "Invalid OTP submitted. Remaining attempts: " + verification.getAttemptsLeft(), ipAddress);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid verification code. You have " + verification.getAttemptsLeft() + " attempts remaining.");
        }

        // 4. Final duplicate guard before account creation
        if (userRepository.existsByEmailIgnoreCase(email) || userRepository.existsByEmail(email)) {
            emailVerificationRepository.delete(verification);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active account with this email address already exists");
        }
        if (userRepository.existsByUsername(verification.getUsername())) {
            emailVerificationRepository.delete(verification);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This username is already taken");
        }

        // 5. Complete User Creation with Customer Role
        User newUser = new User(
                verification.getUsername(),
                verification.getEmail(),
                verification.getPasswordHash(),
                Role.ACCOUNT_HOLDER,
                verification.getFullName()
        );
        newUser.setStatus("ACTIVE");
        User savedUser = userRepository.save(newUser);

        // 6. Provision Primary Vault Account in INR
        String accountNumber = generateAccountNumber();
        Account primaryAccount = new Account(accountNumber, savedUser, "INR", BigDecimal.ZERO.setScale(4));
        primaryAccount.setStatus("ACTIVE");
        accountRepository.save(primaryAccount);

        // 7. Cleanup verification record to prevent reuse or replay
        emailVerificationRepository.delete(verification);

        // 8. Send Account Creation Confirmation Email
        String dateFormatted = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm z")
                .withZone(ZoneId.of("UTC"))
                .format(savedUser.getCreatedAt());

        emailService.sendAccountCreationSuccessEmail(savedUser.getEmail(), savedUser.getFullName(), accountNumber, dateFormatted);

        auditService.logAdminAction(savedUser.getId(), "REGISTRATION_COMPLETED", "USER", String.valueOf(savedUser.getId()),
                "Customer verified email and activated account with primary vault: " + accountNumber, ipAddress);

        String token = jwtService.generateToken(savedUser.getUsername(), savedUser.getRole().name());
        return new AuthResponse(
                token,
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole().name()
        );
    }

    @Transactional
    public OtpInitiateResponse resendOtp(ResendOtpRequest request, String ipAddress) {
        String email = request.getEmail().trim().toLowerCase();

        EmailVerification verification = emailVerificationRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending registration found for this email address"));

        Instant now = Instant.now();
        if (now.isBefore(verification.getResendAvailableAt())) {
            long remainingSeconds = ChronoUnit.SECONDS.between(now, verification.getResendAvailableAt());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait " + remainingSeconds + " seconds before requesting a new verification code.");
        }

        // Generate fresh OTP
        int otpNumber = 100000 + random.nextInt(900000);
        String otp = String.valueOf(otpNumber);

        verification.setOtpHash(passwordEncoder.encode(otp));
        verification.setAttemptsLeft(5);
        verification.setResendAvailableAt(now.plus(60, ChronoUnit.SECONDS));
        verification.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));

        emailVerificationRepository.save(verification);

        emailService.sendRegistrationOtp(email, verification.getFullName(), otp);

        auditService.logAdminAction(null, "REGISTRATION_OTP_RESENT", "USER_ONBOARDING", email,
                "Fresh verification code dispatched to email", ipAddress);

        return new OtpInitiateResponse(
                "OTP_RESENT",
                "A fresh verification code has been dispatched to your email address.",
                email,
                600,
                60
        );
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }

        String email = request.getEmail().trim().toLowerCase();
        String username = request.getUsername().trim();

        if (userRepository.existsByEmail(email) || userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
        }

        String fullName = request.getFullName() != null && !request.getFullName().trim().isEmpty()
                ? request.getFullName().trim()
                : username;

        User user = new User(
                username,
                email,
                passwordEncoder.encode(request.getPassword()),
                Role.ACCOUNT_HOLDER,
                fullName
        );
        user.setStatus("ACTIVE");

        User savedUser = userRepository.save(user);

        // Provision initial primary checking vault account for the customer in INR
        String accountNumber = generateAccountNumber();
        Account account = new Account(accountNumber, savedUser, "INR", BigDecimal.ZERO.setScale(4));
        account.setStatus("ACTIVE");
        accountRepository.save(account);

        String token = jwtService.generateToken(savedUser.getUsername(), savedUser.getRole().name());
        return new AuthResponse(
                token,
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole().name()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        String identifier = request.getIdentifier();
        if (identifier == null || identifier.trim().isEmpty() || request.getPassword() == null || request.getPassword().isEmpty()) {
            auditService.logLoginFailed(identifier != null ? identifier : "UNKNOWN", ipAddress);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        final String cleanId = identifier.trim();

        // Look up registered user by exact email or username
        User user = userRepository.findByEmailIgnoreCase(cleanId)
                .or(() -> userRepository.findByEmail(cleanId))
                .or(() -> userRepository.findByUsername(cleanId))
                .orElse(null);

        if (user == null) {
            auditService.logLoginFailed(cleanId, ipAddress);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Account Lockout check
        if (user.isLocked() || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now()))) {
            long minutesRemaining = user.getLockedUntil() != null
                    ? Math.max(1, ChronoUnit.MINUTES.between(Instant.now(), user.getLockedUntil()) + 1)
                    : 15;
            auditService.logAdminAction(user.getId(), "LOGIN_BLOCKED_ACCOUNT_LOCKED", "SECURITY", user.getUsername(),
                    "Login attempt on locked account. Locked for " + minutesRemaining + " more minutes.", ipAddress);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Account is temporarily locked due to excessive failed attempts. Please try again in " + minutesRemaining + " minutes.");
        }

        // If lock period has expired, automatically unlock
        if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(Instant.now())) {
            user.setLocked(false);
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
        }

        // Check if user status is suspended
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            auditService.logAdminAction(user.getId(), "LOGIN_BLOCKED_SUSPENDED", "SECURITY", user.getUsername(),
                    "Suspended account attempted login", ipAddress);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account has been suspended by system administrator");
        }

        // Verify submitted password against stored BCrypt hash
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= 5) {
                user.setLocked(true);
                user.setLockedUntil(Instant.now().plus(15, ChronoUnit.MINUTES));
                userRepository.save(user);
                auditService.logAdminAction(user.getId(), "ACCOUNT_LOCKED_FAILED_ATTEMPTS", "SECURITY", user.getUsername(),
                        "Account locked for 15 minutes after 5 consecutive failed login attempts", ipAddress);
            } else {
                userRepository.save(user);
                auditService.logLoginFailed(cleanId, ipAddress);
            }

            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Password is correct: reset failed attempts
        if (user.getFailedLoginAttempts() > 0 || user.isLocked()) {
            user.setFailedLoginAttempts(0);
            user.setLocked(false);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        auditService.logLoginSuccess(user.getId(), user.getUsername(), ipAddress);

        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        return new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name()
        );
    }

    public AuthResponse login(LoginRequest request) {
        return login(request, "127.0.0.1");
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getStatus() != null ? user.getStatus() : "ACTIVE",
                user.getCreatedAt()
        );
    }

    @Transactional
    public MessageResponse changePassword(String username, ChangePasswordRequest request, String ipAddress) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password change request is required");
        }
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required");
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 8 characters");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password and confirmation do not match");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            auditService.logAdminAction(user.getId(), "PASSWORD_CHANGE_FAILED", "USER", String.valueOf(user.getId()),
                    "Invalid current password during credential update", ipAddress);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        userRepository.save(user);

        auditService.logAdminAction(user.getId(), "PASSWORD_CHANGE_SUCCESS", "USER", String.valueOf(user.getId()),
                "User updated security credentials successfully", ipAddress);

        return new MessageResponse("Password updated successfully");
    }

    private String generateAccountNumber() {
        String candidate;
        do {
            long number = 1000000000L + (long)(random.nextDouble() * 9000000000L);
            candidate = "AC" + number;
        } while (accountRepository.existsByAccountNumber(candidate));
        return candidate;
    }
}
