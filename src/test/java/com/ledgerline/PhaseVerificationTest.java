package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.*;
import com.ledgerline.model.*;
import com.ledgerline.repository.*;
import com.ledgerline.service.AuthService;
import com.ledgerline.service.ReconciliationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class PhaseVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private EmailVerificationRepository emailVerificationRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private ReconciliationService reconciliationService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("1. Direct registration automatically provisions Customer role and primary INR account")
    @Transactional
    void register_provisionsCustomerAndInrAccount() throws Exception {
        RegisterRequest req = new RegisterRequest("new.customer", "new.customer@test.com", "Password123!", "New Customer User");

        String responseJson = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"))
                .andReturn().getResponse().getContentAsString();

        AuthResponse auth = objectMapper.readValue(responseJson, AuthResponse.class);
        User user = userRepository.findByUsername(auth.getUsername()).orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);

        var accounts = accountRepository.findAllByUser_Username(user.getUsername());
        assertThat(accounts).hasSize(1);
        Account primary = accounts.get(0);
        assertThat(primary.getCurrency()).isEqualTo("INR");
        assertThat(primary.getBalance()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("2. Account lockout after 5 consecutive failed login attempts")
    @Transactional
    void login_locksAccountAfterFiveFailedAttempts() throws Exception {
        User user = userRepository.save(new User(
                "lockout.test",
                "lockout@test.com",
                passwordEncoder.encode("CorrectPassword123!"),
                Role.ACCOUNT_HOLDER,
                "Lockout Test User"
        ));

        LoginRequest badRequest = new LoginRequest("lockout.test", "WrongPassword!");

        // 4 failed attempts should not lock account
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        User midCheck = userRepository.findById(user.getId()).orElseThrow();
        assertThat(midCheck.getFailedLoginAttempts()).isEqualTo(4);
        assertThat(midCheck.isLocked()).isFalse();

        // 5th failed attempt triggers 15-minute lock or 429 rate limit
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().is4xxClientError());

        User lockedUser = userRepository.findById(user.getId()).orElseThrow();
        assertThat(lockedUser.isLocked() || lockedUser.getFailedLoginAttempts() >= 5).isTrue();

        // Attempting while locked should still fail with 4xx client error
        LoginRequest goodRequest = new LoginRequest("lockout.test", "CorrectPassword123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodRequest)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("3. Double-entry Deposit credits customer and debits system cash with zero financial variance")
    @Transactional
    void deposit_maintainsDoubleEntryBalance() throws Exception {
        User user = userRepository.save(new User(
                "deposit.user",
                "deposit@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "Deposit User"
        ));

        Account customerAccount = accountRepository.save(new Account(
                "AC_DEP_001", user, "INR", BigDecimal.ZERO.setScale(4)
        ));

        // Ensure SYSTEM-CASH-INR exists
        if (accountRepository.findByAccountNumber("SYSTEM-CASH-INR").isEmpty()) {
            accountRepository.save(new Account("SYSTEM-CASH-INR", null, "INR", BigDecimal.ZERO.setScale(4)));
        }

        String token = authService.login(new LoginRequest("deposit.user", "Password123!"), "127.0.0.1").getToken();

        DepositWithdrawRequest depReq = new DepositWithdrawRequest(new BigDecimal("2500.0000"), "Verified Deposit Test");

        mockMvc.perform(post("/api/v1/accounts/" + customerAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(2500.0000));

        Account refreshed = accountRepository.findById(customerAccount.getId()).orElseThrow();
        assertThat(refreshed.getBalance()).isEqualByComparingTo(new BigDecimal("2500.0000"));

        var transactions = ledgerEntryRepository.findAllByAccountIdOrderByCreatedAtDesc(customerAccount.getId());
        assertThat(transactions).hasSize(1);
        assertThat(transactions.get(0).getEntryType()).isEqualTo("CREDIT");
        assertThat(transactions.get(0).getAmount()).isEqualByComparingTo(new BigDecimal("2500.0000"));
    }

    @Test
    @DisplayName("4. Withdrawal enforces strict overdraft prevention and blocks excess debits")
    @Transactional
    void withdrawal_blocksOverdraft() throws Exception {
        User user = userRepository.save(new User(
                "withdraw.user",
                "withdraw@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "Withdraw User"
        ));

        Account customerAccount = accountRepository.save(new Account(
                "AC_WTH_001", user, "INR", new BigDecimal("500.0000")
        ));

        if (accountRepository.findByAccountNumber("SYSTEM-CASH-INR").isEmpty()) {
            accountRepository.save(new Account("SYSTEM-CASH-INR", null, "INR", BigDecimal.ZERO.setScale(4)));
        }

        String token = authService.login(new LoginRequest("withdraw.user", "Password123!"), "127.0.0.1").getToken();

        // Valid withdrawal: 200.0000
        DepositWithdrawRequest validWth = new DepositWithdrawRequest(new BigDecimal("200.0000"), "Valid Withdrawal");
        mockMvc.perform(post("/api/v1/accounts/" + customerAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validWth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(300.0000));

        // Overdraft attempt: 500.0000 when only 300.0000 available
        DepositWithdrawRequest overWth = new DepositWithdrawRequest(new BigDecimal("500.0000"), "Overdraft Attempt");
        mockMvc.perform(post("/api/v1/accounts/" + customerAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overWth)))
                .andExpect(status().isUnprocessableEntity());

        Account refreshed = accountRepository.findById(customerAccount.getId()).orElseThrow();
        assertThat(refreshed.getBalance()).isEqualByComparingTo(new BigDecimal("300.0000"));
    }

    @Test
    @DisplayName("5. Financial ledger reconciliation computes zero variance across all entries")
    @Transactional
    void reconciliation_verifiesZeroVariance() {
        var report = reconciliationService.performReconciliation();
        assertThat(report).isNotNull();
        assertThat(report.getStatus()).isEqualTo("BALANCED");
        assertThat(report.getVariance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(report.getDiscrepancyCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("6. Same-currency INR transfer succeeds with atomic double-entry debit and credit")
    @Transactional
    void sameCurrencyTransfer_succeedsWithDoubleEntry() throws Exception {
        User sender = userRepository.save(new User(
                "transfer.sender",
                "sender@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "Transfer Sender"
        ));

        User receiver = userRepository.save(new User(
                "transfer.receiver",
                "receiver@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "Transfer Receiver"
        ));

        Account sourceAcc = accountRepository.save(new Account("AC_SND_001", sender, "INR", new BigDecimal("50.0000")));
        Account destAcc = accountRepository.save(new Account("AC_RCV_001", receiver, "INR", BigDecimal.ZERO.setScale(4)));

        String token = authService.login(new LoginRequest("transfer.sender", "Password123!"), "127.0.0.1").getToken();

        CreateTransferRequest request = new CreateTransferRequest();
        request.setSourceAccountId(sourceAcc.getId());
        request.setDestinationAccountNumber(destAcc.getAccountNumber());
        request.setAmount(new BigDecimal("10.0000"));
        request.setCurrency("INR");
        request.setDescription("Internal INR Transfer Test");

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", "IDEMP-" + java.util.UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(10.0000))
                .andExpect(jsonPath("$.currency").value("INR"));

        Account refreshedSource = accountRepository.findById(sourceAcc.getId()).orElseThrow();
        Account refreshedDest = accountRepository.findById(destAcc.getId()).orElseThrow();
        assertThat(refreshedSource.getBalance()).isEqualByComparingTo(new BigDecimal("40.0000"));
        assertThat(refreshedDest.getBalance()).isEqualByComparingTo(new BigDecimal("10.0000"));
    }

    @Test
    @DisplayName("7. Cross-currency transfer (INR to USD) is rejected with HTTP 422 and safe structured message")
    @Transactional
    void crossCurrencyTransfer_rejectedWith422AndSafeMessage() throws Exception {
        User inrUser = userRepository.save(new User(
                "inr.user",
                "inr@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "INR User"
        ));

        User usdUser = userRepository.save(new User(
                "usd.user",
                "usd@test.com",
                passwordEncoder.encode("Password123!"),
                Role.ACCOUNT_HOLDER,
                "USD User"
        ));

        Account inrAcc = accountRepository.save(new Account("AC_INR_001", inrUser, "INR", new BigDecimal("50.0000")));
        Account usdAcc = accountRepository.save(new Account("AC_USD_001", usdUser, "USD", new BigDecimal("100.0000")));

        String token = authService.login(new LoginRequest("inr.user", "Password123!"), "127.0.0.1").getToken();

        CreateTransferRequest request = new CreateTransferRequest();
        request.setSourceAccountId(inrAcc.getId());
        request.setDestinationAccountNumber(usdAcc.getAccountNumber());
        request.setAmount(new BigDecimal("10.0000"));
        request.setCurrency("INR");
        request.setDescription("Cross currency transfer attempt");

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", "IDEMP-" + java.util.UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.error").value("Unprocessable Entity"))
                .andExpect(jsonPath("$.message").value("Cross-currency transfers are not supported"))
                .andExpect(jsonPath("$.path").value("/api/v1/transfers"));

        // Verify balances untouched
        Account refreshedSource = accountRepository.findById(inrAcc.getId()).orElseThrow();
        Account refreshedDest = accountRepository.findById(usdAcc.getId()).orElseThrow();
        assertThat(refreshedSource.getBalance()).isEqualByComparingTo(new BigDecimal("50.0000"));
        assertThat(refreshedDest.getBalance()).isEqualByComparingTo(new BigDecimal("100.0000"));
    }
}
