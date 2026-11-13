-- ==============================================================================
-- Flyway Migration V4: Add user full_name column
-- BalanceVault - High-Assurance Financial Ledger
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
UPDATE users SET full_name = username WHERE full_name IS NULL;

