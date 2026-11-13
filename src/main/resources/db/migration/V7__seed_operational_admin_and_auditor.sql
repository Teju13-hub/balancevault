-- ==============================================================================
-- Flyway Migration V7: Provision Operational Admin and Auditor Credentials
-- BalanceVault - High-Assurance Financial Ledger
-- Password for admin: AdminPass123!
-- Password for auditor: AuditorPass123!
-- ==============================================================================

UPDATE users
SET password = '$2a$10$9RK4WKPfKqvaqQMTDXz5MOhzqO.fEpeRS.5Vu32B2T8AC9u07K7ou',
    status = 'ACTIVE',
    is_locked = FALSE,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE username = 'admin';

UPDATE users
SET password = '$2a$10$e8D9SuR47B/cPDEaGUgBG.rr9mCGRh7tyL5nq1nN7VTJ5hsggeOZe',
    status = 'ACTIVE',
    is_locked = FALSE,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE username = 'auditor';

