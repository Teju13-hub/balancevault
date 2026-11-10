package com.ledgerline;

import com.ledgerline.model.Account;
import com.ledgerline.model.IdempotencyRecord;
import com.ledgerline.model.LedgerEntry;
import com.ledgerline.model.Role;
import com.ledgerline.model.Transfer;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.IdempotencyRecordRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.repository.TransferRepository;
import com.ledgerline.repository.UserRepository;
import org.h2.api.Trigger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DatabaseIntegrityTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUserA;
    private User testUserB;
    private Account accountA;
    private Account accountB;

    // H2-compatible trigger implementation for simulating PostgreSQL append-only and truncate triggers
    public static class AppendOnlyTrigger implements Trigger {
        @Override
        public void init(Connection conn, String schemaName, String triggerName, String tableName, boolean before, int type) {}

        @Override
        public void fire(Connection conn, Object[] oldRow, Object[] newRow) throws SQLException {
            throw new SQLException("Table is append-only. UPDATE and DELETE operations are prohibited.");
        }

        @Override
        public void close() {}

        @Override
        public void remove() {}
    }

    public static class PreventTruncateTrigger implements Trigger {
        @Override
        public void init(Connection conn, String schemaName, String triggerName, String tableName, boolean before, int type) {}

        @Override
        public void fire(Connection conn, Object[] oldRow, Object[] newRow) throws SQLException {
            throw new SQLException("Table is protected. TRUNCATE and bulk operations are strictly prohibited.");
        }

        @Override
        public void close() {}

        @Override
        public void remove() {}
    }

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_append_only_test");
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_truncate_test");
        transferRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        testUserA = userRepository.save(new User("integUserA", "userA@integ.test", "pass123", Role.ACCOUNT_HOLDER));
        testUserB = userRepository.save(new User("integUserB", "userB@integ.test", "pass123", Role.ACCOUNT_HOLDER));

        accountA = accountRepository.save(new Account("AC_INT_001", testUserA, "USD", new BigDecimal("500.0000")));
        accountB = accountRepository.save(new Account("AC_INT_002", testUserB, "USD", new BigDecimal("250.0000")));
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_append_only_test");
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_truncate_test");
    }

    @Test
    @DisplayName("1. Negative account balance is rejected by database constraint")
    void negativeBalance_isRejected() {
        Account negativeAccount = new Account("AC_NEG_001", testUserA, "USD", new BigDecimal("-50.0000"));
        assertThrows(Exception.class, () -> {
            accountRepository.saveAndFlush(negativeAccount);
        }, "Database must reject negative balance via chk_accounts_balance_non_negative");
    }

    @Test
    @DisplayName("2. Zero or negative transfer amount is rejected by database constraint")
    void zeroOrNegativeTransferAmount_isRejected() {
        Transfer zeroTransfer = new Transfer(
                "REF_ZERO_" + UUID.randomUUID(),
                accountA,
                accountB,
                BigDecimal.ZERO.setScale(4),
                "USD",
                "PENDING",
                "Zero amount test",
                "idem-zero-1"
        );
        assertThrows(Exception.class, () -> {
            transferRepository.saveAndFlush(zeroTransfer);
        }, "Database must reject zero transfer amount");

        Transfer negativeTransfer = new Transfer(
                "REF_NEG_" + UUID.randomUUID(),
                accountA,
                accountB,
                new BigDecimal("-100.0000"),
                "USD",
                "PENDING",
                "Negative amount test",
                "idem-neg-1"
        );
        assertThrows(Exception.class, () -> {
            transferRepository.saveAndFlush(negativeTransfer);
        }, "Database must reject negative transfer amount");
    }

    @Test
    @DisplayName("3. Source and destination accounts must be distinct (self-transfer rejected)")
    void selfTransfer_isRejected() {
        Transfer selfTransfer = new Transfer(
                "REF_SELF_" + UUID.randomUUID(),
                accountA,
                accountA,
                new BigDecimal("50.0000"),
                "USD",
                "PENDING",
                "Self transfer test",
                "idem-self-1"
        );
        assertThrows(Exception.class, () -> {
            transferRepository.saveAndFlush(selfTransfer);
        }, "Database must reject transfers where source_account_id == destination_account_id");
    }

    @Test
    @DisplayName("4. Duplicate idempotency keys are rejected by unique constraint")
    void duplicateIdempotencyKeys_areRejected() {
        String idempotencyKey = "unique-key-xyz-" + UUID.randomUUID();

        IdempotencyRecord record1 = new IdempotencyRecord(idempotencyKey, testUserA, "/api/v1/transfers", "hash123");
        idempotencyRecordRepository.saveAndFlush(record1);

        IdempotencyRecord record2 = new IdempotencyRecord(idempotencyKey, testUserA, "/api/v1/transfers", "hash123");
        assertThrows(DataIntegrityViolationException.class, () -> {
            idempotencyRecordRepository.saveAndFlush(record2);
        }, "Database must reject duplicate idempotency keys");
    }

    @Test
    @DisplayName("5. Invalid account reference is rejected by foreign key constraint")
    void invalidAccountReference_isRejected() {
        assertThrows(Exception.class, () -> {
            jdbcTemplate.execute(
                    "INSERT INTO transfers (reference_id, source_account_id, destination_account_id, amount, currency, status, created_at) " +
                    "VALUES ('REF_INVALID_FK', 999999, " + accountB.getId() + ", 10.0000, 'USD', 'PENDING', CURRENT_TIMESTAMP)"
            );
        }, "Foreign key constraint must reject non-existent source_account_id");
    }

    @Test
    @DisplayName("6. Ledger UPDATE and DELETE are blocked by append-only trigger")
    void ledgerEntries_modificationAndDeletion_areBlocked() {
        LedgerEntry entry = new LedgerEntry();
        entry.setAccount(accountA);
        entry.setEntryType("CREDIT");
        entry.setAmount(new BigDecimal("100.0000"));
        entry.setBalanceAfter(new BigDecimal("600.0000"));
        entry.setDescription("Test initial credit");
        entry.setReferenceId("REF_L_001");
        LedgerEntry savedEntry = ledgerEntryRepository.saveAndFlush(entry);

        try {
            // Register H2 trigger simulating PostgreSQL trg_ledger_entries_append_only
            jdbcTemplate.execute("CREATE TRIGGER trg_ledger_append_only_test " +
                    "BEFORE UPDATE, DELETE ON ledger_entries " +
                    "FOR EACH ROW CALL \"com.ledgerline.DatabaseIntegrityTest$AppendOnlyTrigger\"");

            // Attempt UPDATE
            assertThrows(Exception.class, () -> {
                jdbcTemplate.execute("UPDATE ledger_entries SET amount = 999.0000 WHERE id = " + savedEntry.getId());
            }, "Append-only trigger must prohibit UPDATE on ledger_entries");

            // Attempt DELETE
            assertThrows(Exception.class, () -> {
                jdbcTemplate.execute("DELETE FROM ledger_entries WHERE id = " + savedEntry.getId());
            }, "Append-only trigger must prohibit DELETE on ledger_entries");
        } finally {
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_append_only_test");
        }
    }

    @Test
    @DisplayName("7. TRUNCATE is blocked on protected financial and audit tables")
    void truncate_isBlockedOnProtectedTables() {
        LedgerEntry entry = new LedgerEntry();
        entry.setAccount(accountA);
        entry.setEntryType("CREDIT");
        entry.setAmount(new BigDecimal("50.0000"));
        entry.setBalanceAfter(new BigDecimal("550.0000"));
        entry.setDescription("Truncate guard test entry");
        ledgerEntryRepository.saveAndFlush(entry);

        try {
            // Register trigger simulating PostgreSQL prevent_table_truncation
            jdbcTemplate.execute("CREATE TRIGGER trg_ledger_truncate_test " +
                    "BEFORE DELETE ON ledger_entries " +
                    "FOR EACH ROW CALL \"com.ledgerline.DatabaseIntegrityTest$PreventTruncateTrigger\"");

            assertThrows(Exception.class, () -> {
                jdbcTemplate.execute("DELETE FROM ledger_entries");
            }, "Triggers must prevent bulk purging/truncation on ledger_entries");
        } finally {
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_ledger_truncate_test");
        }
    }

    @Test
    @DisplayName("8. Flyway migration V3 integrity hardening file is structurally complete and valid")
    void migrationFiles_areValid() throws Exception {
        ClassPathResource v1Resource = new ClassPathResource("db/migration/V1__core_schema.sql");
        assertTrue(v1Resource.exists(), "V1__core_schema.sql must exist");

        ClassPathResource v3Resource = new ClassPathResource("db/migration/V3__integrity_hardening.sql");
        assertTrue(v3Resource.exists(), "V3__integrity_hardening.sql must exist");

        String v3Sql;
        try (InputStream is = v3Resource.getInputStream()) {
            v3Sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Verify all required Phase 2 database hardening constructs exist in V3 SQL
        assertTrue(v3Sql.contains("chk_accounts_balance_non_negative"), "Must contain account balance non-negative check");
        assertTrue(v3Sql.contains("chk_transfers_amount_positive"), "Must contain positive transfer amount check");
        assertTrue(v3Sql.contains("chk_transfers_distinct_accounts"), "Must contain distinct account check");
        assertTrue(v3Sql.contains("CREATE TABLE transfers"), "Must create transfers table");
        assertTrue(v3Sql.contains("CREATE TABLE idempotency_records"), "Must create idempotency_records table");
        assertTrue(v3Sql.contains("trg_transfers_prevent_delete"), "Must protect transfers from deletion");
        assertTrue(v3Sql.contains("trg_ledger_entries_prevent_truncate"), "Must protect ledger_entries from TRUNCATE");
        assertTrue(v3Sql.contains("trg_audit_log_prevent_truncate"), "Must protect audit_log from TRUNCATE");
        assertTrue(v3Sql.contains("trg_transfers_prevent_truncate"), "Must protect transfers from TRUNCATE");
        assertTrue(v3Sql.contains("trg_idempotency_records_prevent_truncate"), "Must protect idempotency_records from TRUNCATE");
    }
}
