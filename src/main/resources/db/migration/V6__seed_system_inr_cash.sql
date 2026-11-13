-- ==============================================================================
-- Flyway Migration V6: Seed INR System Cash Account for Deposits and Withdrawals
-- BalanceVault - High-Assurance Financial Ledger
-- ==============================================================================

-- 1. Ensure system cash accounts exist for both USD and INR double-entry operations
INSERT INTO accounts (account_number, user_id, currency, balance, type, status, created_at, updated_at)
SELECT 'SYSTEM-CASH-INR', NULL, 'INR', 0.0000, 'SYSTEM', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM accounts WHERE account_number = 'SYSTEM-CASH-INR'
);

-- 2. Ensure default currency on accounts table defaults to INR for future customer accounts
ALTER TABLE accounts ALTER COLUMN currency SET DEFAULT 'INR';
