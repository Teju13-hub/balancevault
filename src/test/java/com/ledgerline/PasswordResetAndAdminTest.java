package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.ForgotPasswordRequest;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.ResetPasswordRequest;
import com.ledgerline.model.PasswordResetToken;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AuditLogRepository;
import com.ledgerline.repository.PasswordResetTokenRepository;
import com.ledgerline.repository.UserRepository;
import com.ledgerline.security.JwtService;
import com.ledgerline.security.ratelimit.RateLimiterService;
import com.ledgerline.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetAndAdminTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RateLimiterService rateLimiterService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();
    }

    // =========================================================================
    // PART 1: ADMIN LOGIN & ROLE AUTHORIZATION TESTS
    // =========================================================================

    @Test
    @DisplayName("Admin can authenticate, receives ADMIN role claim in JWT, and accesses Admin metrics")
    void adminCanAuthenticateAndAccessAdminApis() throws Exception {
        // Ensure admin user exists with active credentials
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User newAdmin = new User("admin", "admin@ledgerline.local", passwordEncoder.encode("AdminPass123!"), Role.ADMIN, "System Administrator");
            return userRepository.save(newAdmin);
        });
        admin.setPassword(passwordEncoder.encode("AdminPass123!"));
        admin.setLocked(false);
        admin.setFailedLoginAttempts(0);
        userRepository.save(admin);

        // 1. Authenticate via POST /api/v1/auth/login
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setIdentifier("admin");
        loginRequest.setPassword("AdminPass123!");

        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> authData = objectMapper.readValue(response, Map.class);
        String token = (String) authData.get("token");
        assertNotNull(token);
        assertEquals("ADMIN", jwtService.extractRole(token));

        // 2. Access Admin metrics with Admin token -> HTTP 200
        mockMvc.perform(get("/api/v1/admin/metrics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.systemHealth").value("HEALTHY"));

        // 3. Access Admin users list -> HTTP 200
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Customer cannot access Admin endpoints (403 Forbidden)")
    void customerCannotAccessAdminApis() throws Exception {
        // Create or find customer
        User customer = userRepository.findByUsername("test_cust_auth").orElseGet(() -> {
            User c = new User("test_cust_auth", "test_cust_auth@example.com", passwordEncoder.encode("SecurePass123!"), Role.ACCOUNT_HOLDER, "Test Customer");
            return userRepository.save(c);
        });

        String custToken = jwtService.generateToken(customer.getUsername(), customer.getRole().name());

        // Customer attempts to access Admin metrics -> 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/metrics")
                        .header("Authorization", "Bearer " + custToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Customer attempts to access Admin users -> 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + custToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Admin can authenticate using email admin@ledgerline.local and configured Admin123@ password")
    void adminCanAuthenticateUsingEmailAndConfiguredPassword() throws Exception {
        // Ensure admin user exists with Admin123@ encoded
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User newAdmin = new User("admin", "admin@ledgerline.local", passwordEncoder.encode("Admin123@"), Role.ADMIN, "System Administrator");
            return userRepository.save(newAdmin);
        });
        admin.setEmail("admin@ledgerline.local");
        admin.setPassword(passwordEncoder.encode("Admin123@"));
        admin.setLocked(false);
        admin.setFailedLoginAttempts(0);
        userRepository.save(admin);

        // 1. Authenticate with email
        LoginRequest emailLogin = new LoginRequest();
        emailLogin.setEmail("admin@ledgerline.local");
        emailLogin.setPassword("Admin123@");

        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emailLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.email").value("admin@ledgerline.local"))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> authData = objectMapper.readValue(response, Map.class);
        String token = (String) authData.get("token");
        assertNotNull(token);
        assertEquals("ADMIN", jwtService.extractRole(token));

        // 2. Authenticate with username
        LoginRequest userLogin = new LoginRequest();
        userLogin.setUsername("admin");
        userLogin.setPassword("Admin123@");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("Auditor is strictly read-only: cannot perform Admin write operations")
    void auditorCannotPerformAdminWriteOperations() throws Exception {
        User auditor = userRepository.findByUsername("auditor").orElseGet(() -> {
            User a = new User("auditor", "auditor@ledgerline.local", passwordEncoder.encode("AuditorPass123!"), Role.AUDITOR, "System Auditor");
            return userRepository.save(a);
        });

        String audToken = jwtService.generateToken(auditor.getUsername(), auditor.getRole().name());

        // Auditor attempts to access Admin command center -> 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/metrics")
                        .header("Authorization", "Bearer " + audToken))
                .andExpect(status().isForbidden());

        // Auditor attempts to create privileged user -> 403 Forbidden
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + audToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"bad_user\",\"email\":\"bad@test.com\",\"password\":\"Pass123!\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        // Auditor CAN read audit logs -> HTTP 200
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + audToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin can access complete command center endpoints (Overview, Accounts, Transactions, Telemetry, Reports)")
    void adminCanAccessAllCommandCenterEndpoints() throws Exception {
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User a = new User("admin", "admin@ledgerline.local", passwordEncoder.encode("Admin123@"), Role.ADMIN, "System Administrator");
            return userRepository.save(a);
        });

        String adminToken = jwtService.generateToken(admin.getUsername(), admin.getRole().name());

        // 1. Overview
        mockMvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.systemHealth").value("HEALTHY"))
                .andExpect(jsonPath("$.recentTransactions").isArray())
                .andExpect(jsonPath("$.activityOverTime").isArray());

        // 2. Accounts
        mockMvc.perform(get("/api/v1/admin/accounts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 3. Transactions
        mockMvc.perform(get("/api/v1/admin/transactions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 4. Security Telemetry
        mockMvc.perform(get("/api/v1/admin/security/telemetry")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bruteForceDefenseStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.securitySummary").isMap());

        // 5. Reports
        mockMvc.perform(get("/api/v1/admin/reports")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("DAILY"))
                .andExpect(jsonPath("$.dailySummaries").isArray());
    }

    @Test
    @DisplayName("Admin can lock and unlock customer account with audit verification")
    void adminCanLockAndUnlockCustomer() throws Exception {
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User a = new User("admin", "admin@ledgerline.local", passwordEncoder.encode("Admin123@"), Role.ADMIN, "System Administrator");
            return userRepository.save(a);
        });
        String adminToken = jwtService.generateToken(admin.getUsername(), admin.getRole().name());

        User customer = userRepository.findByUsername("test_lock_target").orElseGet(() -> {
            User c = new User("test_lock_target", "lock_target@example.com", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, "Lock Target");
            return userRepository.save(c);
        });

        // 1. Lock customer
        mockMvc.perform(post("/api/v1/admin/users/" + customer.getId() + "/lock")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isLocked").value(true))
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        User lockedUser = userRepository.findById(customer.getId()).orElseThrow();
        assertTrue(lockedUser.isLocked());

        // 2. Unlock customer
        mockMvc.perform(post("/api/v1/admin/users/" + customer.getId() + "/unlock")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isLocked").value(false))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        User unlockedUser = userRepository.findById(customer.getId()).orElseThrow();
        assertFalse(unlockedUser.isLocked());
        assertEquals(0, unlockedUser.getFailedLoginAttempts());
    }

    @Test
    @DisplayName("Admin can securely change own password with verification")
    void adminCanChangePasswordSecurely() throws Exception {
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User a = new User("admin", "admin@ledgerline.local", passwordEncoder.encode("Admin123@"), Role.ADMIN, "System Administrator");
            return userRepository.save(a);
        });
        admin.setPassword(passwordEncoder.encode("CurrentPass123!"));
        userRepository.save(admin);

        String adminToken = jwtService.generateToken(admin.getUsername(), admin.getRole().name());

        // 1. Wrong current password -> 400 Bad Request
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"WrongPass!\",\"newPassword\":\"NewPass1234@\",\"confirmPassword\":\"NewPass1234@\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("Current password is incorrect")));

        // 2. Mismatched confirmation -> 400 Bad Request
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"CurrentPass123!\",\"newPassword\":\"NewPass1234@\",\"confirmPassword\":\"DifferentPass@\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("do not match")));

        // 3. Successful change
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"CurrentPass123!\",\"newPassword\":\"NewPass1234@\",\"confirmPassword\":\"NewPass1234@\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("Password updated successfully")));

        // Verify in DB
        User updatedAdmin = userRepository.findByUsername("admin").orElseThrow();
        assertTrue(passwordEncoder.matches("NewPass1234@", updatedAdmin.getPassword()));

        // Restore for test independence
        updatedAdmin.setPassword(passwordEncoder.encode("Admin123@"));
        userRepository.save(updatedAdmin);
    }

    // =========================================================================
    // PART 2: FORGOT PASSWORD & PASSWORD RESET LIFECYCLE TESTS
    // =========================================================================

    @Test
    @DisplayName("Forgot password returns generic 200 response for both existing and non-existing emails (enumeration safe)")
    void forgotPasswordReturnsGenericResponse() throws Exception {
        // 1. Non-existent email
        ForgotPasswordRequest nonExistentReq = new ForgotPasswordRequest("nonexistent_user_9999@example.com");
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(nonExistentReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("password reset link has been dispatched")));

        // 2. Existing customer email
        User customer = userRepository.findByUsername("test_reset_enum").orElseGet(() -> {
            User c = new User("test_reset_enum", "test_reset_enum@example.com", passwordEncoder.encode("InitialPass123!"), Role.ACCOUNT_HOLDER, "Enum Test");
            return userRepository.save(c);
        });

        ForgotPasswordRequest existingReq = new ForgotPasswordRequest(customer.getEmail());
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(existingReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("password reset link has been dispatched")));

        // Token must be stored in DB hashed with SHA-256 (64 hex characters)
        List<PasswordResetToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(customer.getId()) && !t.isUsed())
                .toList();
        assertFalse(tokens.isEmpty());
        PasswordResetToken storedToken = tokens.get(tokens.size() - 1);
        assertEquals(64, storedToken.getTokenHash().length());
        assertFalse(storedToken.isUsed());
        assertTrue(storedToken.getExpiresAt().isAfter(Instant.now()));
    }

    @Test
    @DisplayName("Full reset flow: valid token resets password, old password fails, new password succeeds")
    void fullPasswordResetFlowSuccess() throws Exception {
        String username = "test_cust_lifecycle";
        String email = "lifecycle@example.com";
        String oldPassword = "OldPassword123!";
        String newPassword = "BrandNewPassword2026!";

        // Ensure user exists with old password
        User user = userRepository.findByUsername(username).orElseGet(() -> {
            User u = new User(username, email, passwordEncoder.encode(oldPassword), Role.ACCOUNT_HOLDER, "Lifecycle User");
            return userRepository.save(u);
        });
        user.setPassword(passwordEncoder.encode(oldPassword));
        user.setLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        // 1. Request password reset
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest(email))))
                .andExpect(status().isOk());

        // Find the generated token for this user
        PasswordResetToken resetTokenEntity = tokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()) && !t.isUsed())
                .reduce((first, second) -> second)
                .orElseThrow();

        // Note: In real life rawToken is emailed. Here we test the reset API using a token whose SHA-256 matches
        String testRawToken = "test-raw-token-lifecycle-" + System.currentTimeMillis();
        String testTokenHash = passwordResetService.hashSha256(testRawToken);
        resetTokenEntity.setTokenHash(testTokenHash);
        tokenRepository.save(resetTokenEntity);

        // 2. Submit reset with new password
        ResetPasswordRequest resetReq = new ResetPasswordRequest(testRawToken, newPassword, newPassword);
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("Password has been reset successfully")));

        // 3. Verify token is marked as USED
        PasswordResetToken updatedToken = tokenRepository.findById(resetTokenEntity.getId()).orElseThrow();
        assertTrue(updatedToken.isUsed());
        assertNotNull(updatedToken.getUsedAt());

        // 4. Verify login with OLD password FAILS (401)
        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setIdentifier(username);
        oldLogin.setPassword(oldPassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());

        // 5. Verify login with NEW password SUCCEEDS (200)
        LoginRequest newLogin = new LoginRequest();
        newLogin.setIdentifier(username);
        newLogin.setPassword(newPassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.username").value(username));
    }

    @Test
    @DisplayName("Reused reset token is rejected with 400 Bad Request")
    void reusedTokenIsRejected() throws Exception {
        User user = userRepository.findByUsername("test_cust_reused").orElseGet(() -> {
            User u = new User("test_cust_reused", "reused@example.com", passwordEncoder.encode("Password123!"), Role.ACCOUNT_HOLDER, "Reused User");
            return userRepository.save(u);
        });

        String rawToken = "token-already-used-" + System.currentTimeMillis();
        PasswordResetToken token = new PasswordResetToken(user, passwordResetService.hashSha256(rawToken), Instant.now().plus(15, ChronoUnit.MINUTES), "127.0.0.1");
        token.setUsed(true);
        token.setUsedAt(Instant.now().minus(5, ChronoUnit.MINUTES));
        tokenRepository.save(token);

        ResetPasswordRequest request = new ResetPasswordRequest(rawToken, "NewSecurePassword123!", "NewSecurePassword123!");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("already been used")));
    }

    @Test
    @DisplayName("Expired reset token is rejected with 400 Bad Request")
    void expiredTokenIsRejected() throws Exception {
        User user = userRepository.findByUsername("test_cust_expired").orElseGet(() -> {
            User u = new User("test_cust_expired", "expired@example.com", passwordEncoder.encode("Password123!"), Role.ACCOUNT_HOLDER, "Expired User");
            return userRepository.save(u);
        });

        String rawToken = "token-expired-" + System.currentTimeMillis();
        // Expired 10 minutes ago
        PasswordResetToken token = new PasswordResetToken(user, passwordResetService.hashSha256(rawToken), Instant.now().minus(10, ChronoUnit.MINUTES), "127.0.0.1");
        tokenRepository.save(token);

        ResetPasswordRequest request = new ResetPasswordRequest(rawToken, "NewSecurePassword123!", "NewSecurePassword123!");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("expired")));
    }

    @Test
    @DisplayName("Invalid/non-existent reset token is rejected with 400 Bad Request")
    void invalidTokenIsRejected() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("completely-bogus-token-xyz-12345", "NewSecurePassword123!", "NewSecurePassword123!");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("Invalid or expired")));
    }

    @Test
    @DisplayName("Mismatched confirm password and weak passwords are rejected")
    void weakAndMismatchedPasswordsAreRejected() throws Exception {
        // 1. Mismatch
        ResetPasswordRequest mismatchReq = new ResetPasswordRequest("valid-looking-token", "ValidPass123!", "DifferentPass123!");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mismatchReq)))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("do not match")));

        // 2. Weak (missing numbers/specials)
        ResetPasswordRequest weakReq = new ResetPasswordRequest("valid-looking-token", "alllowercase", "alllowercase");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(weakReq)))
                .andExpect(status().isBadRequest())
                .andExpect(status().reason(containsString("Password must be at least 8 characters")));
    }
}
