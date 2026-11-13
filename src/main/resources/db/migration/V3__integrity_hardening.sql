-- ==============================================================================
-- Flyway Migration V3: Financial Transfer Engine Schema
-- BalanceVault - High-Assurance Financial Ledger
-- ==============================================================================

-- 1. Reconcile ledger_entries.transaction_id for TransferService compatibility
-- Allows double-entry ledger records to be written without legacy transaction_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ledger_entries' AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE ledger_entries ALTER COLUMN transaction_id DROP NOT NULL;
    END IF;
END $$;

-- 2. Validate currency format on accounts & account balance non-negative check
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_balance_non_negative') THEN
        ALTER TABLE accounts ADD CONSTRAINT chk_accounts_balance_non_negative CHECK (balance >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_currency_format') THEN
        ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency_format CHECK (LENGTH(currency) = 3);
    END IF;
END $$;

-- 3. Hardening constraints on ledger_entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ledger_entries_amount_positive') THEN
        ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ledger_entries_balance_after_non_negative') THEN
        ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_balance_after_non_negative CHECK (balance_after >= 0);
    END IF;
END $$;

-- 4. Create transfers table (two-legged financial transfers)
CREATE TABLE transfers (
    id BIGSERIAL PRIMARY KEY,
    reference_id VARCHAR(100) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED')),
    description VARCHAR(255),
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT chk_transfers_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_source_account_id ON transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination_account_id ON transfers(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_idempotency_key ON transfers(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);

-- 5. Create idempotency_records table
CREATE TABLE idempotency_records (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    response_status_code INT,
    response_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 HOURS')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_records_user_id ON idempotency_records(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_records_expires_at ON idempotency_records(expires_at);

-- 6. Immutability trigger for transfers table
CREATE OR REPLACE FUNCTION prevent_record_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % does not allow record deletion. Financial records are immutable.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transfers_prevent_delete ON transfers;
CREATE TRIGGER trg_transfers_prevent_delete
BEFORE DELETE ON transfers
FOR EACH ROW
EXECUTE FUNCTION prevent_record_deletion();

-- 7. Truncate prevention function and triggers
CREATE OR REPLACE FUNCTION prevent_table_truncation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is protected. TRUNCATE operation is strictly prohibited.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entries_prevent_truncate ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_prevent_truncate
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncation();

DROP TRIGGER IF EXISTS trg_audit_log_prevent_truncate ON audit_log;
CREATE TRIGGER trg_audit_log_prevent_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncation();

DROP TRIGGER IF EXISTS trg_transfers_prevent_truncate ON transfers;
CREATE TRIGGER trg_transfers_prevent_truncate
BEFORE TRUNCATE ON transfers
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncation();

DROP TRIGGER IF EXISTS trg_idempotency_records_prevent_truncate ON idempotency_records;
CREATE TRIGGER trg_idempotency_records_prevent_truncate
BEFORE TRUNCATE ON idempotency_records
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncation();
