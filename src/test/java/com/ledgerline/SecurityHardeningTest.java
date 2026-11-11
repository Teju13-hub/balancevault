package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.dto.CreateTransferRequest;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.RegisterRequest;
import com.ledgerline.model.Account;
import com.ledgerline.model.AuditLog;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.AuditLogRepository;
import com.ledgerline.repository.IdempotencyRecordRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.repository.TransferRepository;
import com.ledgerline.repository.UserRepository;
import com.ledgerline.security.JwtService;
import com.ledgerline.security.ratelimit.RateLimiterService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RateLimiterService rateLimiterService;

    private User accountHolder;
    private User auditor;
    private User admin;
    private Account sourceAccount;
    private Account destAccount;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();
        transferRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        auditLogRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        accountHolder = userRepository.save(new User("sec_user", "sec_user@example.com", passwordEncoder.encode("ValidPassword123!"), Role.ACCOUNT_HOLDER));
        auditor = userRepository.save(new User("sec_auditor", "auditor@example.com", passwordEncoder.encode("AuditorPass123!"), Role.AUDITOR));
        admin = userRepository.save(new User("sec_admin", "admin@example.com", passwordEncoder.encode("AdminPass123!"), Role.ADMIN));

        sourceAccount = accountRepository.save(new Account("AC1122334455", accountHolder, "USD", new BigDecimal("1000.0000")));
        destAccount = accountRepository.save(new Account("AC9988776655", admin, "USD", new BigDecimal("200.0000")));
    }

    @Test
    @DisplayName("1. Login rate limiting blocks excessive brute force attempts with HTTP 429")
    void loginRateLimiting_blocksExcessiveAttemptsWith429() throws Exception {
        LoginRequest badRequest = new LoginRequest("sec_user", "WrongPassword999!");

        // Default capacity is 5 tokens: 5 rapid calls should be processed (and return 401)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th call from the same IP must be rejected with 429 Too Many Requests
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"));
    }

    @Test
    @DisplayName("2. Registration rate limiting blocks rapid user generation with HTTP 429")
    void registrationRateLimiting_blocksRapidUserGenerationWith429() throws Exception {
        // First 5 registrations succeed with 201 Created
        for (int i = 0; i < 5; i++) {
            RegisterRequest reg = new RegisterRequest("spam_user_" + i, "spam_" + i + "@example.com", "Password123!");
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reg)))
                    .andExpect(status().isCreated());
        }

        // 6th registration from the same IP is blocked with 429
        RegisterRequest regExceeded = new RegisterRequest("spam_user_6", "spam_6@example.com", "Password123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regExceeded)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    @DisplayName("3. Expired JWT rejection returns HTTP 401 Unauthorized")
    void expiredJwtRejection_returns401() throws Exception {
        // Construct token expired 1 hour ago
        Date past = new Date(System.currentTimeMillis() - 3600000);
        Date pastIssued = new Date(System.currentTimeMillis() - 7200000);

        SecretKey key = Keys.hmacShaKeyFor("404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970".getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("sec_user")
                .claim("role", "ACCOUNT_HOLDER")
                .issuedAt(pastIssued)
                .expiration(past)
                .signWith(key, Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/api/v1/accounts/" + sourceAccount.getId())
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("4. Invalid JWT signature rejection returns HTTP 401 Unauthorized")
    void invalidJwtSignatureRejection_returns401() throws Exception {
        // Signed with an unauthorized key
        SecretKey rogueKey = Keys.hmacShaKeyFor("completely-different-unauthorized-secret-key-32bytes!".getBytes(StandardCharsets.UTF_8));
        String forgedToken = Jwts.builder()
                .subject("sec_user")
                .claim("role", "ACCOUNT_HOLDER")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(rogueKey, Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/api/v1/accounts/" + sourceAccount.getId())
                        .header("Authorization", "Bearer " + forgedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("5. Malformed JWT rejection returns HTTP 401 Unauthorized")
    void malformedJwtRejection_returns401() throws Exception {
        String malformedToken = "invalid.malformed.header.signature";

        mockMvc.perform(get("/api/v1/accounts/" + sourceAccount.getId())
                        .header("Authorization", "Bearer " + malformedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @WithMockUser(username = "sec_user", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("6. ACCOUNT_HOLDER calling administrative endpoint is denied with HTTP 403 Forbidden")
    void accountHolderCallingAdminEndpoint_isDeniedWith403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/status"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @WithMockUser(username = "sec_auditor", roles = {"AUDITOR"})
    @DisplayName("7. Auditor attempting transfer initiation is denied with HTTP 403 Forbidden")
    void auditorTransferDenial_returns403() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                sourceAccount.getId(),
                destAccount.getId(),
                new BigDecimal("50.0000"),
                "USD",
                "Auditor trying to move funds"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        assertEquals(0, transferRepository.count());
    }

    @Test
    @DisplayName("8. Audit log access restrictions enforce role boundary: ACCOUNT_HOLDER denied, ADMIN/AUDITOR allowed")
    void auditLogAccessRestrictions() throws Exception {
        // Unauthenticated access -> 401
        mockMvc.perform(get("/api/v1/audit-logs"))
                .andExpect(status().isUnauthorized());

        // Token for ACCOUNT_HOLDER -> 403
        String userToken = jwtService.generateToken("sec_user", Role.ACCOUNT_HOLDER.name());
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // Token for AUDITOR -> 200
        String auditorToken = jwtService.generateToken("sec_auditor", Role.AUDITOR.name());
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk());

        // Token for ADMIN -> 200
        String adminToken = jwtService.generateToken("sec_admin", Role.ADMIN.name());
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("9. Passwords and JWT secrets never appear in audit logs across operations")
    void passwordsAndSecretsNeverAppearInAuditLogs() throws Exception {
        String sensitivePassword = "SuperSecretPassword999#";

        // 1. Failed login with sensitive password
        LoginRequest failedLogin = new LoginRequest("sec_user", sensitivePassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(failedLogin)))
                .andExpect(status().isUnauthorized());

        // 2. Successful login
        LoginRequest validLogin = new LoginRequest("sec_user", "ValidPassword123!");
        String loginRes = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // 3. Admin status check
        String adminToken = jwtService.generateToken("sec_admin", Role.ADMIN.name());
        mockMvc.perform(get("/api/v1/admin/status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 4. Create account
        String userToken = jwtService.generateToken("sec_user", Role.ACCOUNT_HOLDER.name());
        mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAccountRequest("USD"))))
                .andExpect(status().isCreated());

        // Verify all audit log entries
        List<AuditLog> auditLogs = auditLogRepository.findAll();
        assertFalse(auditLogs.isEmpty());

        for (AuditLog log : auditLogs) {
            String details = log.getDetails() != null ? log.getDetails() : "";
            String action = log.getAction() != null ? log.getAction() : "";
            String entityId = log.getEntityId() != null ? log.getEntityId() : "";

            assertFalse(details.contains(sensitivePassword), "Audit log details must never contain user passwords");
            assertFalse(details.contains("ValidPassword123!"), "Audit log details must never contain user passwords");
            assertFalse(details.contains("404E63526655"), "Audit log must never expose JWT signing secret");
            assertFalse(action.contains(sensitivePassword));
            assertFalse(entityId.contains(sensitivePassword));
        }
    }

    @Test
    @DisplayName("10. Existing authentication and transfer functionality still works seamlessly")
    void existingAuthAndTransferFunctionalityStillWorks() throws Exception {
        // 1. Login
        LoginRequest loginReq = new LoginRequest("sec_user", "ValidPassword123!");
        String authJson = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(authJson).get("token").asText();

        // 2. Transfer using Bearer token
        CreateTransferRequest transferReq = new CreateTransferRequest(
                sourceAccount.getId(),
                destAccount.getId(),
                new BigDecimal("120.0000"),
                "USD",
                "Working transfer check"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", "SEC-TRANSFER-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(120.0000));

        Account updatedSource = accountRepository.findById(sourceAccount.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("880.0000").compareTo(updatedSource.getBalance()));
    }
}
