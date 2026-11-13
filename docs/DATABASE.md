# BalanceVault — Database Design & Schema Reference

This document details the PostgreSQL 18 database architecture, schema definitions, constraints, triggers, and Flyway migration history for BalanceVault.

---

## 1. Entity-Relationship & Relational Architecture

The relational model is designed around strict double-entry ledger bookkeeping, where monetary amounts are immutable, accounts are partitioned into Customer and System tiers, and every financial movement produces matching debits and credits.

```text
+-----------------------+              +-----------------------+
|         users         |              | email_verifications   |
+-----------------------+              +-----------------------+
| id (PK)               |<----+        | id (PK)               |
| username (UNIQUE)     |     |        | email (UNIQUE)        |
| email (UNIQUE)        |     |        | username (UNIQUE)     |
| password (BCrypt)     |     |        | full_name             |
| full_name             |     |        | password_hash         |
| role                  |     |        | otp_hash              |
| status                |     |        | attempts_left         |
| is_locked             |     |        | expires_at            |
| failed_login_attempts |     |        +-----------------------+
| locked_until          |     |
| created_at            |     |        +-----------------------+
+-----------+-----------+     |        | password_reset_tokens |
            | 1               |        +-----------------------+
            |                 +--------| id (PK)               |
            | N                        | user_id (FK -> users) |
+-----------v-----------+              | token_hash (SHA-256)  |
|       accounts        |              | expires_at            |
+-----------------------+              | used (BOOLEAN)        |
| id (PK)               |<----+        | used_at               |
| account_number (UQ)   |     |        | ip_address            |
| user_id (FK -> users) |     |        +-----------------------+
| currency (INR/USD)    |     |
| balance NUMERIC(19,4) |     | 1
| type (CUSTOMER/SYSTEM)|     |
| status (ACTIVE/FROZEN)|     |
| created_at            |     | N
| updated_at            |     +--------+
+-----------+-----------+              |
            | 1                        |
            |                          |
            | N                        |
+-----------v-----------+              |
|    ledger_entries     |              |
+-----------------------+              |
| id (PK)               |              |
| account_id (FK -> acc)|              |
| entry_type (DR/CR)    |              |
| amount NUMERIC(19,4)  |              |
| balance_after NUMERIC |              |
| reference_id          |              |
| description           |              |
| created_at            |              |
+-----------------------+              |
                                       |
+-----------------------+              |
|       transfers       |              |
+-----------------------+              |
| id (PK)               |              |
| reference_id (UNIQUE) |              |
| source_account_id (FK)+--------------+
| dest_account_id (FK)  +--------------+
| amount NUMERIC(19,4)  |
| currency              |
| status                |
| idempotency_key (UQ)  |
| created_at            |
| completed_at          |
+-----------------------+
```

---

## 2. Table Specifications & Constraints

### 2.1 `users` Table
Stores authentication credentials, security flags, and role assignments.
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'ACCOUNT_HOLDER', 'AUDITOR')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LOCKED')),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 `accounts` Table
Maintains segregated customer accounts and internal system cash vaults.
```sql
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (LENGTH(currency) = 3),
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    type VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER' CHECK (type IN ('CUSTOMER', 'SYSTEM')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT customer_has_owner CHECK (type = 'SYSTEM' OR user_id IS NOT NULL),
    CONSTRAINT balance_non_negative CHECK (type = 'SYSTEM' OR balance >= 0)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

#### System Accounts vs. Customer Accounts
- **`SYSTEM` accounts** (`SYSTEM-CASH-INR` and `SYSTEM-CASH`) have `user_id = NULL` and represent internal liquidity reserves. Deposits credit customer accounts and debit system cash vaults; withdrawals debit customer accounts and credit system cash vaults.
- **`CUSTOMER` accounts** (`AC...`) are owned by an authenticated customer (`user_id NOT NULL`), enforce strict overdraft protection (`balance >= 0`), and default to `INR` currency.

### 2.3 `transfers` Table
Tracks two-legged financial movements between distinct accounts.
```sql
CREATE TABLE transfers (
    id BIGSERIAL PRIMARY KEY,
    reference_id VARCHAR(100) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED')),
    description VARCHAR(255),
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT chk_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id)
);

CREATE INDEX idx_transfers_source_account_id ON transfers(source_account_id);
CREATE INDEX idx_transfers_destination_account_id ON transfers(destination_account_id);
CREATE INDEX idx_transfers_idempotency_key ON transfers(idempotency_key);
```

### 2.4 `ledger_entries` Table (Append-Only)
The core double-entry accounting ledger.
```sql
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(19, 4) NOT NULL CHECK (balance_after >= 0),
    description VARCHAR(255),
    reference_id VARCHAR(100),
    transaction_id BIGINT REFERENCES transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_reference_id ON ledger_entries(reference_id);
```

### 2.5 `audit_log` Table (Append-Only)
Immutable audit trail capturing authentication events and administrative interventions.
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### 2.6 `password_reset_tokens` Table
Manages single-use, time-limited password recovery tokens.
```sql
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
```

---

## 3. Database Triggers for Immutability

PostgreSQL triggers strictly enforce append-only immutability. Any attempt by an application query or direct SQL update to modify or delete existing ledger or audit rows raises a runtime database exception:

```sql
CREATE OR REPLACE FUNCTION prevent_modification_or_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is append-only. UPDATE and DELETE operations are prohibited.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_table_truncation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is protected. TRUNCATE operation is strictly prohibited.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
CREATE TRIGGER trg_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

CREATE TRIGGER trg_ledger_entries_prevent_truncate
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncation();

CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

CREATE TRIGGER trg_audit_log_prevent_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncation();

CREATE TRIGGER trg_transfers_prevent_delete
BEFORE DELETE ON transfers
FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();
```

---

## 4. Flyway Migration Version History

| Migration Version | Description | Key Changes |
|---|---|---|
| `V1__core_schema.sql` | Core Schema | Initial `users`, `accounts`, `ledger_entries`, `audit_log` tables and append-only trigger functions. |
| `V2__integrity_hardening.sql` | Integrity Hardening | Added `accounts.type` (`CUSTOMER`, `SYSTEM`), nullable `user_id` for system accounts, seeded `SYSTEM-CASH` (USD), and TRUNCATE protection triggers. |
| `V3__integrity_hardening.sql` | Financial Transfer Engine | Created `transfers` and `idempotency_records` tables. Added positive amount checks and distinct source/destination account constraints. |
| `V4__add_user_full_name.sql` | User Profile Enhancement | Added `full_name` column to `users` table and backfilled existing usernames. |
| `V5__email_verification_and_security.sql` | OTP & Account Security | Created `email_verifications` table. Added `failed_login_attempts`, `locked_until`, `is_locked`, and `status` columns to `users` and `accounts`. |
| `V6__seed_system_inr_cash.sql` | INR Currency Support | Seeded `SYSTEM-CASH-INR` system account and set default account currency to `INR`. |
| `V7__seed_operational_admin_and_auditor.sql` | Operational Credential Provisioning | Reset failed attempts and configured active status for initial administrative accounts. |
| `V8__password_reset_tokens.sql` | Password Reset Recovery | Created `password_reset_tokens` table with SHA-256 token hash storage, 15-minute TTL, and single-use enforcement. |

