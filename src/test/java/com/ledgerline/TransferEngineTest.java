package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.CreateTransferRequest;
import com.ledgerline.dto.TransferResponse;
import com.ledgerline.model.Account;
import com.ledgerline.model.AuditLog;
import com.ledgerline.model.LedgerEntry;
import com.ledgerline.model.Role;
import com.ledgerline.model.Transfer;
import com.ledgerline.model.User;
import com.ledgerline.repository.*;
import com.ledgerline.service.TransferService;
import com.ledgerline.service.TransferService.TransferExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransferEngineTest {

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
    private TransferService transferService;

    private User userA;
    private User userB;
    private User auditorUser;
    private User adminUser;

    private Account accountA;
    private Account accountB;
    private Account accountC;

    @BeforeEach
    void setUp() {
        transferRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        auditLogRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User("userA", "userA@example.com", "passA", Role.ACCOUNT_HOLDER));
        userB = userRepository.save(new User("userB", "userB@example.com", "passB", Role.ACCOUNT_HOLDER));
        auditorUser = userRepository.save(new User("auditor_user", "auditor@example.com", "passAudit", Role.AUDITOR));
        adminUser = userRepository.save(new User("admin_user", "admin@example.com", "passAdmin", Role.ADMIN));

        accountA = accountRepository.save(new Account("AC1000000001", userA, "USD", new BigDecimal("500.0000")));
        accountB = accountRepository.save(new Account("AC2000000002", userB, "USD", new BigDecimal("100.0000")));
        accountC = accountRepository.save(new Account("AC3000000003", userA, "USD", new BigDecimal("50.0000")));
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("1. Successful transfer: balances debit and credit accurately")
    void successfulTransfer_updatesBalancesAndCreatesRecord() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("150.0000"),
                "USD",
                "Vendor disbursement payment"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Idempotency-Key", "IDEMP-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(150.0000))
                .andExpect(jsonPath("$.referenceId").isNotEmpty());

        Account updatedA = accountRepository.findById(accountA.getId()).orElseThrow();
        Account updatedB = accountRepository.findById(accountB.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("350.0000").compareTo(updatedA.getBalance()));
        assertEquals(0, new BigDecimal("250.0000").compareTo(updatedB.getBalance()));

        List<Transfer> transfers = transferRepository.findAll();
        assertEquals(1, transfers.size());
        assertEquals("COMPLETED", transfers.get(0).getStatus());
        assertEquals(0, new BigDecimal("150.0000").compareTo(transfers.get(0).getAmount()));
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("2. Correct debit and credit ledger entries created for transfer")
    void correctDebitAndCreditLedgerEntries() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("100.0000"),
                "USD",
                "Invoice settlement"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Transfer transfer = transferRepository.findAll().get(0);
        List<LedgerEntry> entries = ledgerEntryRepository.findAll();

        assertEquals(2, entries.size());

        LedgerEntry debit = entries.stream().filter(e -> "DEBIT".equals(e.getEntryType())).findFirst().orElseThrow();
        LedgerEntry credit = entries.stream().filter(e -> "CREDIT".equals(e.getEntryType())).findFirst().orElseThrow();

        assertEquals(accountA.getId(), debit.getAccount().getId());
        assertEquals(0, new BigDecimal("100.0000").compareTo(debit.getAmount()));
        assertEquals(0, new BigDecimal("400.0000").compareTo(debit.getBalanceAfter()));
        assertEquals(transfer.getReferenceId(), debit.getReferenceId());

        assertEquals(accountB.getId(), credit.getAccount().getId());
        assertEquals(0, new BigDecimal("100.0000").compareTo(credit.getAmount()));
        assertEquals(0, new BigDecimal("200.0000").compareTo(credit.getBalanceAfter()));
        assertEquals(transfer.getReferenceId(), credit.getReferenceId());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("3. Double-entry amounts are strictly equal and system value is conserved")
    void doubleEntryAmountsAreEqual() throws Exception {
        BigDecimal initialSum = accountA.getBalance().add(accountB.getBalance());

        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("73.2500"),
                "USD",
                "Precision test"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        List<LedgerEntry> entries = ledgerEntryRepository.findAll();
        LedgerEntry debit = entries.stream().filter(e -> "DEBIT".equals(e.getEntryType())).findFirst().orElseThrow();
        LedgerEntry credit = entries.stream().filter(e -> "CREDIT".equals(e.getEntryType())).findFirst().orElseThrow();

        assertEquals(0, debit.getAmount().compareTo(credit.getAmount()));

        Account updatedA = accountRepository.findById(accountA.getId()).orElseThrow();
        Account updatedB = accountRepository.findById(accountB.getId()).orElseThrow();
        BigDecimal finalSum = updatedA.getBalance().add(updatedB.getBalance());

        assertEquals(0, initialSum.compareTo(finalSum), "Conservation of financial balance violated");
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("4. Insufficient balance returns HTTP 422 Unprocessable Entity")
    void insufficientBalance_returns422() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("999.0000"), // Exceeds balance of 500.0000
                "USD",
                "Overdraft attempt"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());

        // Assert balances unchanged
        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("500.0000").compareTo(currentA.getBalance()));
        assertEquals(0, transferRepository.count());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("5. Zero and negative amounts return HTTP 400 Bad Request")
    void zeroAndNegativeAmount_returns400() throws Exception {
        CreateTransferRequest zeroRequest = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                BigDecimal.ZERO,
                "USD",
                "Zero amount"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroRequest)))
                .andExpect(status().isBadRequest());

        CreateTransferRequest negativeRequest = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("-50.0000"),
                "USD",
                "Negative amount"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negativeRequest)))
                .andExpect(status().isBadRequest());

        assertEquals(0, transferRepository.count());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("6. Same-account transfer returns HTTP 400 Bad Request")
    void sameAccountTransfer_returns400() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountA.getId(),
                new BigDecimal("50.0000"),
                "USD",
                "Self transfer"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        assertEquals(0, transferRepository.count());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("7. Duplicate idempotency key returns original transfer result without double debit")
    void duplicateIdempotencyKey_returnsOriginalResult() throws Exception {
        String key = "IDEMP-KEY-777";
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("100.0000"),
                "USD",
                "Rent payment"
        );

        // First call
        String response1 = mockMvc.perform(post("/api/v1/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        TransferResponse res1 = objectMapper.readValue(response1, TransferResponse.class);

        // Second call with same key and same payload
        String response2 = mockMvc.perform(post("/api/v1/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        TransferResponse res2 = objectMapper.readValue(response2, TransferResponse.class);

        assertEquals(res1.getReferenceId(), res2.getReferenceId());
        assertEquals(res1.getId(), res2.getId());

        // Source balance debited ONLY ONCE (500 - 100 = 400)
        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("400.0000").compareTo(currentA.getBalance()));
        assertEquals(1, transferRepository.count());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("8. Same idempotency key with different payload returns HTTP 409 Conflict")
    void sameKeyDifferentPayload_returns409Conflict() throws Exception {
        String key = "IDEMP-KEY-CONFLICT";
        CreateTransferRequest request1 = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("50.0000"),
                "USD",
                "First payload"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        // Same key, different amount
        CreateTransferRequest request2 = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("120.0000"),
                "USD",
                "Different payload"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isConflict());

        // Assert second transfer was not processed
        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("450.0000").compareTo(currentA.getBalance()));
        assertEquals(1, transferRepository.count());
    }

    @Test
    @DisplayName("9. Concurrent requests with same idempotency key create exactly one transfer")
    void concurrentRequestsWithSameIdempotencyKey_executeOnce() throws Exception {
        String key = "CONCURRENT-KEY-" + UUID.randomUUID();
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("25.0000"),
                "USD",
                "Concurrent key test"
        );

        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<TransferExecutionResult> results = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    TransferExecutionResult res = transferService.executeTransfer(
                            request,
                            key,
                            "userA",
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER")),
                            "127.0.0.1"
                    );
                    results.add(res);
                } catch (ResponseStatusException e) {
                    if (e.getStatusCode().value() == 409) {
                        conflictCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        // Exactly 1 transfer record created
        assertEquals(1, transferRepository.count());
        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("475.0000").compareTo(currentA.getBalance()));
    }

    @Test
    @DisplayName("10. Multiple simultaneous withdrawals from one account debit safely without race condition")
    void multipleSimultaneousWithdrawals_debitSafely() throws Exception {
        // Initial balance A: 500.0000
        // 10 concurrent threads each withdrawing 20.0000 -> Total 200.0000
        int threadCount = 10;
        BigDecimal amount = new BigDecimal("20.0000");

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    CreateTransferRequest req = new CreateTransferRequest(
                            accountA.getId(),
                            accountB.getId(),
                            amount,
                            "USD",
                            "Simultaneous withdrawal " + index
                    );
                    transferService.executeTransfer(
                            req,
                            "MULTI-WITHDRAW-" + index + "-" + UUID.randomUUID(),
                            "userA",
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER")),
                            "127.0.0.1"
                    );
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    System.err.println("Thread failed in multipleSimultaneousWithdrawals: " + e.getClass().getName() + " -> " + e.getMessage());
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(15, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(10, successCount.get());
        assertEquals(0, failureCount.get());

        Account updatedA = accountRepository.findById(accountA.getId()).orElseThrow();
        Account updatedB = accountRepository.findById(accountB.getId()).orElseThrow();

        // 500 - (10 * 20) = 300.0000
        assertEquals(0, new BigDecimal("300.0000").compareTo(updatedA.getBalance()));
        // 100 + (10 * 20) = 300.0000
        assertEquals(0, new BigDecimal("300.0000").compareTo(updatedB.getBalance()));

        assertEquals(10, transferRepository.count());
        assertEquals(20, ledgerEntryRepository.count()); // 10 debits + 10 credits
    }

    @Test
    @WithMockUser(username = "userB", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("11. Account ownership authorization rejects caller spending from unowned account")
    void accountOwnershipAuthorization_returns403() throws Exception {
        // User B attempts to transfer money out of account A (owned by User A)
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("50.0000"),
                "USD",
                "Unauthorized spending attempt"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Balance untouched
        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("500.0000").compareTo(currentA.getBalance()));
        assertEquals(0, transferRepository.count());
    }

    @Test
    @DisplayName("12. Full rollback when any ledger operation fails preserves initial balances")
    void fullRollback_whenLedgerFails() {
        BigDecimal initialA = accountA.getBalance();
        BigDecimal initialB = accountB.getBalance();

        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("100.0000"),
                "USD",
                "Rollback test"
        );

        // Attempt transfer with an invalid user triggering rollback
        assertThrows(ResponseStatusException.class, () -> {
            transferService.executeTransfer(
                    request,
                    null,
                    "non_existent_user",
                    Collections.emptyList(),
                    "127.0.0.1"
            );
        });

        Account currentA = accountRepository.findById(accountA.getId()).orElseThrow();
        Account currentB = accountRepository.findById(accountB.getId()).orElseThrow();

        assertEquals(0, initialA.compareTo(currentA.getBalance()));
        assertEquals(0, initialB.compareTo(currentB.getBalance()));
        assertEquals(0, transferRepository.count());
        assertEquals(0, ledgerEntryRepository.count());
    }

    @Test
    @DisplayName("13. No negative balances after concurrent transfers exceeding available balance")
    void noNegativeBalances_afterConcurrentOverdraftTransfers() throws Exception {
        // Account C has only 50.0000 balance
        // 5 threads each try to withdraw 25.0000 (total attempted = 125.0000)
        // Exactly 2 transfers can succeed (2 * 25 = 50), and 3 must fail with 422
        int threadCount = 5;
        BigDecimal amount = new BigDecimal("25.0000");

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientFundsCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    CreateTransferRequest req = new CreateTransferRequest(
                            accountC.getId(),
                            accountB.getId(),
                            amount,
                            "USD",
                            "Overdraft race " + index
                    );
                    transferService.executeTransfer(
                            req,
                            "RACE-" + index + "-" + UUID.randomUUID(),
                            "userA",
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER")),
                            "127.0.0.1"
                    );
                    successCount.incrementAndGet();
                } catch (ResponseStatusException e) {
                    if (e.getStatusCode().value() == 422) {
                        insufficientFundsCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(15, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(2, successCount.get(), "Exactly 2 transfers should have succeeded");
        assertEquals(3, insufficientFundsCount.get(), "Exactly 3 transfers should have failed with 422");

        Account finalC = accountRepository.findById(accountC.getId()).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.setScale(4).compareTo(finalC.getBalance()));
        assertTrue(finalC.getBalance().compareTo(BigDecimal.ZERO) >= 0, "Account balance must NEVER become negative");
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("14. GET transfer by participant succeeds with 200 OK")
    void getTransfer_byParticipant_succeeds() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("60.0000"),
                "USD",
                "Participant test"
        );

        String json = mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        TransferResponse created = objectMapper.readValue(json, TransferResponse.class);

        mockMvc.perform(get("/api/v1/transfers/" + created.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.getId()))
                .andExpect(jsonPath("$.referenceId").value(created.getReferenceId()))
                .andExpect(jsonPath("$.amount").value(60.0000));
    }

    @Test
    @WithMockUser(username = "auditor_user", roles = {"AUDITOR"})
    @DisplayName("15. GET transfer by AUDITOR succeeds with 200 OK")
    void getTransfer_byAuditor_succeeds() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("80.0000"),
                "USD",
                "Audit inspection transfer"
        );

        TransferExecutionResult res = transferService.executeTransfer(
                request,
                null,
                "userA",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER")),
                "127.0.0.1"
        );

        mockMvc.perform(get("/api/v1/transfers/" + res.getResponse().getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(res.getResponse().getId()))
                .andExpect(jsonPath("$.amount").value(80.0000));
    }

    @Test
    @WithMockUser(username = "userB", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("16. GET transfer by third party returns 404 (prevents transfer ID enumeration)")
    void getTransfer_byUnrelatedUser_returns404() throws Exception {
        // Transfer between Account A and Account C (both owned by User A)
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountC.getId(),
                new BigDecimal("20.0000"),
                "USD",
                "Internal A-to-C transfer"
        );

        TransferExecutionResult res = transferService.executeTransfer(
                request,
                null,
                "userA",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER")),
                "127.0.0.1"
        );

        // User B tries to read transfer between A and C
        mockMvc.perform(get("/api/v1/transfers/" + res.getResponse().getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("17. Transfer events are recorded in audit system")
    void transferEvents_areRecordedInAuditSystem() throws Exception {
        CreateTransferRequest request = new CreateTransferRequest(
                accountA.getId(),
                accountB.getId(),
                new BigDecimal("45.0000"),
                "USD",
                "Audit log check"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        List<AuditLog> auditLogs = auditLogRepository.findAll();
        assertFalse(auditLogs.isEmpty());

        boolean hasInitiated = auditLogs.stream().anyMatch(l -> "TRANSFER_INITIATED".equals(l.getAction()));
        boolean hasCompleted = auditLogs.stream().anyMatch(l -> "TRANSFER_COMPLETED".equals(l.getAction()));

        assertTrue(hasInitiated, "Expected TRANSFER_INITIATED audit event");
        assertTrue(hasCompleted, "Expected TRANSFER_COMPLETED audit event");
    }
}
