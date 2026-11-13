-- ==============================================================================
-- Flyway Migration V2: Database Integrity Hardening (Reconstructed from DB Catalog)
-- BalanceVault - High-Assurance Financial Ledger
-- ==============================================================================

-- 1. Support Account Types and System Accounts
ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE accounts
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE accounts
    ADD CONSTRAINT accounts_type_check 
    CHECK (type IN ('CUSTOMER', 'SYSTEM'));

ALTER TABLE accounts
    ADD CONSTRAINT balance_non_negative 
    CHECK (type = 'SYSTEM' OR balance >= 0);

ALTER TABLE accounts
    ADD CONSTRAINT customer_has_owner 
    CHECK (type = 'SYSTEM' OR user_id IS NOT NULL);

-- 2. Seed System Cash Account (idempotent insert)
INSERT INTO accounts (account_number, user_id, currency, balance, type)
VALUES ('SYSTEM-CASH', NULL, 'USD', 0.0000, 'SYSTEM')
ON CONFLICT (account_number) DO NOTHING;

-- 3. Legacy Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(12) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    initiated_by BIGINT NOT NULL REFERENCES users(id),
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT transactions_initiated_by_idempotency_key_key UNIQUE (initiated_by, idempotency_key)
);

-- 4. Link Ledger Entries to Transactions & Add Positive Amount Check
ALTER TABLE ledger_entries
    ADD COLUMN IF NOT EXISTS transaction_id BIGINT REFERENCES transactions(id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);

ALTER TABLE ledger_entries
    ADD CONSTRAINT ledger_amount_positive CHECK (amount > 0);

-- 5. TRUNCATE Prevention Triggers
CREATE TRIGGER trg_ledger_no_truncate
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_modification_or_deletion();

CREATE TRIGGER trg_audit_no_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_modification_or_deletion();

