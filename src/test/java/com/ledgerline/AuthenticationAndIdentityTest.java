package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.CreateTransferRequest;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.RegisterRequest;
import com.ledgerline.model.Account;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.*;
import com.ledgerline.security.JwtService;
import com.ledgerline.security.ratelimit.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationAndIdentityTest {

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

    private User registeredCustomer;
    private User registeredAdmin;
    private User registeredAuditor;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();
        transferRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        auditLogRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        // Seed verified users
        registeredCustomer = userRepository.save(new User(
                "eleanor.vance",
                "eleanor.vance@example.com",
                passwordEncoder.encode("ValidPassword123!"),
                Role.ACCOUNT_HOLDER,
                "Eleanor Vance"
        ));

        registeredAdmin = userRepository.save(new User(
                "sec.admin",
                "admin@balancevault.com",
                passwordEncoder.encode("AdminPass123!"),
                Role.ADMIN,
                "Security Administrator"
        ));

        registeredAuditor = userRepository.save(new User(
                "audit.officer",
                "auditor@balancevault.com",
                passwordEncoder.encode("AuditorPass123!"),
                Role.AUDITOR,
                "Lead Auditor"
        ));
    }

    @Test
    @DisplayName("1. Unregistered email login is rejected with HTTP 401 Unauthorized")
    void login_unregisteredEmail_rejectedWith401() throws Exception {
        LoginRequest request = new LoginRequest("nonexistent@example.com", "SomePassword123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(status().reason(containsString("Invalid email or password")));
    }

    @Test
    @DisplayName("2. Incorrect password for registered user is rejected with HTTP 401 Unauthorized")
    void login_incorrectPassword_rejectedWith401() throws Exception {
        LoginRequest request = new LoginRequest("eleanor.vance@example.com", "WrongPassword999!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(status().reason(containsString("Invalid email or password")));
    }

    @Test
    @DisplayName("3. Successful customer login returns token and actual registered user identity")
    void login_registeredCustomer_succeedsWithActualDetails() throws Exception {
        LoginRequest request = new LoginRequest("eleanor.vance@example.com", "ValidPassword123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.username").value("eleanor.vance"))
                .andExpect(jsonPath("$.email").value("eleanor.vance@example.com"))
                .andExpect(jsonPath("$.fullName").value("Eleanor Vance"))
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"));
    }

    @Test
    @DisplayName("4. Successful admin login returns token and ADMIN role")
    void login_registeredAdmin_succeedsWithAdminRole() throws Exception {
        LoginRequest request = new LoginRequest("admin@balancevault.com", "AdminPass123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.username").value("sec.admin"))
                .andExpect(jsonPath("$.email").value("admin@balancevault.com"))
                .andExpect(jsonPath("$.fullName").value("Security Administrator"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("5. Duplicate email registration is rejected with HTTP 409 Conflict")
    void register_duplicateEmail_rejectedWith409() throws Exception {
        RegisterRequest request = new RegisterRequest("new.username", "eleanor.vance@example.com", "Password123!", "New Name");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(status().reason(containsString("Email is already registered")));
    }

    @Test
    @DisplayName("6. Public registration strictly assigns ACCOUNT_HOLDER role, ignoring any ADMIN role submission")
    void register_cannotEscalateRoleToAdmin() throws Exception {
        RegisterRequest request = new RegisterRequest("hacker.user", "hacker@example.com", "Password123!", "Hacker Attack");
        request.setRole("ADMIN"); // Attacker attempting privilege escalation

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"))
                .andExpect(jsonPath("$.email").value("hacker@example.com"))
                .andExpect(jsonPath("$.fullName").value("Hacker Attack"));

        User saved = userRepository.findByEmail("hacker@example.com").orElse(null);
        assertNotNull(saved);
        assertEquals(Role.ACCOUNT_HOLDER, saved.getRole());
    }

    @Test
    @DisplayName("7. Protected /api/v1/auth/me returns actual logged-in user profile")
    void getCurrentUser_returnsActualRegisteredProfile() throws Exception {
        String token = jwtService.generateToken(registeredCustomer.getUsername(), registeredCustomer.getRole().name());

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("eleanor.vance"))
                .andExpect(jsonPath("$.email").value("eleanor.vance@example.com"))
                .andExpect(jsonPath("$.fullName").value("Eleanor Vance"))
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"));
    }

    @Test
    @DisplayName("8. Direct API access: Customer denied from admin endpoints with HTTP 403 Forbidden")
    void directApi_customerBlockedFromAdminEndpoints() throws Exception {
        String customerToken = jwtService.generateToken(registeredCustomer.getUsername(), registeredCustomer.getRole().name());

        mockMvc.perform(get("/api/v1/admin/status")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("9. Direct API access: Auditor denied from initiating financial transfers with HTTP 403 Forbidden")
    void directApi_auditorBlockedFromInitiatingTransfers() throws Exception {
        String auditorToken = jwtService.generateToken(registeredAuditor.getUsername(), registeredAuditor.getRole().name());

        Account acc1 = accountRepository.save(new Account("AC1010101010", registeredCustomer, "USD", new BigDecimal("500.0000")));
        Account acc2 = accountRepository.save(new Account("AC2020202020", registeredAdmin, "USD", new BigDecimal("100.0000")));

        CreateTransferRequest transferReq = new CreateTransferRequest(
                acc1.getId(),
                acc2.getId(),
                new BigDecimal("50.0000"),
                "USD",
                "Unauthorized Auditor Transfer"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + auditorToken)
                        .header("X-Idempotency-Key", "AUDITOR-BLOCKED-KEY-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("10. Direct API access: Auditor can read audit trail successfully")
    void directApi_auditorCanAccessAuditLogs() throws Exception {
        String auditorToken = jwtService.generateToken(registeredAuditor.getUsername(), registeredAuditor.getRole().name());

        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("11. Admin can manage user directory via /api/v1/admin/users")
    void admin_canCreatePrivilegedUser() throws Exception {
        String adminToken = jwtService.generateToken(registeredAdmin.getUsername(), registeredAdmin.getRole().name());

        Map<String, String> newAdminReq = Map.of(
                "username", "promoted.admin",
                "email", "promoted.admin@balancevault.com",
                "password", "AdminSecret123!",
                "fullName", "Promoted Admin User",
                "role", "ADMIN"
        );

        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAdminReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.fullName").value("Promoted Admin User"));
    }
}

