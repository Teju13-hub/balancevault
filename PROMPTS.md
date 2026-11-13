# BalanceVault — AI-Assisted Engineering Prompt Log (PROMPTS.md)

This document honestly records genuine AI-assisted engineering prompts, tool interactions, automated test executions, and technical corrections performed during the development, hardening, and verification of the BalanceVault application.

All prompts and entries documented below are derived directly from the active project development history. No entries, dates, or outputs have been fabricated. Sensitive credentials, passwords, and private secrets have been excluded in compliance with security guidelines.

---

## Prompt Entry 1: Money Transfer Currency Mismatch Investigation

- **Date**: 2026-11-13
- **Task**: Root Cause Analysis of Money Transfer Failure
- **Category**: Banking Logic & Error Handling
- **Tool / Environment**: Read-only codebase inspection, PowerShell, AST code review

### Actual Prompt Summary
> "Investigate the BalanceVault Money Transfer failure in READ-ONLY mode. Do not modify any files or database records.
> Observed frontend error: 'Transfer Failed — Validation failed. Please check your transaction amount.'
> Test details: Source account had ₹50 available balance. Destination account was verified successfully. Transfer amount entered was ₹10. Transfer failed during submission.
> Investigate frontend transfer form validation, Transfer API endpoint, expected DTO fields, service-level validation, and whether currency mismatch is rejecting the transfer."

### Results & Findings
- Inspected `TransferService.java`, `MoneyTransferPage.tsx`, and PostgreSQL `accounts` table.
- Detected that the source account was denominated in `INR` (₹), while the destination account was created under `USD` ($).
- `TransferService.java` explicitly enforces `!source.getCurrency().equals(destination.getCurrency()) -> CurrencyMismatchException`.
- The backend correctly returned HTTP 422 Unprocessable Entity, but the frontend error handler displayed a generic fallback message: `"Validation failed. Please check your transaction amount."`

### Correction & Resolution
- Added currency comparison logic in `MoneyTransferPage.tsx` during recipient account lookup.
- If currencies differ, the UI displays: `"Currency mismatch. Transfers are only supported between accounts with the same currency."`
- The transfer confirmation button remains disabled until a compatible recipient currency is selected.

---

## Prompt Entry 2: Admin Authentication & Self-Service Password Recovery

- **Date**: 2026-11-13
- **Task**: Admin Login Provisioning & Forgot Password Recovery Implementation
- **Category**: Authentication, Authorization & Security
- **Tool / Environment**: Spring Security 6, BCrypt, Flyway, React TypeScript

### Actual Prompt Summary
> "Complete BOTH Admin Login and Forgot Password functionality in the existing BalanceVault project.
> Inspect existing ADMIN role, admin bootstrap, database migrations, and security configuration.
> Verify whether an Admin account exists and fix Admin authentication using the existing login page and role-based access.
> Implement complete customer self-service password recovery:
> 1. Add Forgot Password link to the login screen.
> 2. Create ForgotPasswordPage with email input.
> 3. Generate high-entropy secure reset token with 15-minute expiration.
> 4. Create ResetPasswordPage with token validation.
> 5. Update user password securely using BCrypt."

### Results & Findings
- Discovered that previous migrations contained hardcoded placeholder password hashes that did not match active runtime BCrypt salts.
- Admin bootstrap needed to be decoupled from hardcoded source code values.
- Password recovery required a secure, single-use token table with cryptographic hash storage rather than storing raw tokens in the database.

### Correction & Resolution
- Implemented `AdminProvisioningRunner.java` executing on Spring Boot startup: checks if an administrative user exists and applies a secure, BCrypt-hashed password.
- Created Flyway migration `V8__password_reset_tokens.sql` storing SHA-256 token hashes, 15-minute TTL (`expires_at`), `used` boolean flag, and client IP address.
- Created `ForgotPasswordPage.tsx` and `ResetPasswordPage.tsx` integrated with `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password`.
- Added 13 automated tests in `PasswordResetAndAdminTest.java` verifying complete token lifecycle and brute-force prevention.

---

## Prompt Entry 3: Backend Local Port Migration to 8081

- **Date**: 2026-11-13
- **Task**: Port Conflict Resolution
- **Category**: Infrastructure & Configuration
- **Tool / Environment**: Spring Boot configuration, Vite proxy, PowerShell

### Actual Prompt Summary
> "Fix the local backend port conflict for BalanceVault.
> Configure the backend to run on port 8081 without changing the database configuration.
> Ensure the frontend API base URL also points to http://localhost:8081.
> Update only the necessary configuration files without changing business logic."

### Results & Findings
- Inspected `src/main/resources/application.yml`, `start-backend.ps1`, and `frontend/vite.config.ts`.
- Port 8080 experienced intermittent port exhaustion / socket contention with existing local background processes.

### Correction & Resolution
- Updated `application.yml` setting `server.port: ${PORT:8081}`.
- Updated `start-backend.ps1` to explicitly bind to port 8081.
- Updated `frontend/vite.config.ts` proxy target from `http://localhost:8080` to `http://localhost:8081`.
- Verified that health checks and authentication endpoints responded with HTTP 200 on port 8081.

---

## Prompt Entry 4: Admin Command Center Enhancement & Double-Entry Pairing Fix

- **Date**: 2026-11-13
- **Task**: Professional Banking Admin Command Center & Transaction Pairing
- **Category**: Double-Entry Accounting, Role-Based Access Control & Audit
- **Tool / Environment**: Spring Data JPA, React, Lucide Icons, REST APIs

### Actual Prompt Summary
> "Inspect the entire existing BalanceVault project and upgrade the CURRENT Admin Dashboard into a complete, professional banking Admin Command Center.
> Every displayed feature, button, search, filter, chart, and action must work with real PostgreSQL data and backend APIs.
> Admin-only APIs must remain protected with Spring Security and role-based authorization.
> Fix transaction monitoring in Admin where transactions data was missing or displaying system cash accounts instead of customer accounts."

### Results & Findings
- In `AdminController.java`, deposits and withdrawals were grouped naively from individual ledger entries (`LED-`), causing `SYSTEM-CASH-INR` to appear as the primary customer account.
- The double-entry transactions required proper grouping by transfer reference ID to extract the actual customer account number and customer username.

### Correction & Resolution
- Refactored `buildUnifiedTransactions()` in `AdminController.java`:
  - Deposit transactions (`DEP-`): Source resolves to `SYSTEM-CASH-INR` (@CASHIER) and destination resolves to the customer vault (`AC...`) and customer username.
  - Withdrawal transactions (`WTH-`): Source resolves to the customer vault (`AC...`) and customer username, and destination resolves to `SYSTEM-CASH-INR`.
  - Transfer transactions (`TRF-`): Atomically pairs customer debit account and customer credit account.
- Implemented real-time double-entry reconciliation (`GET /api/v1/admin/reconciliation`) confirming total debits equal total credits ($10,326.00 = $10,326.00, variance = 0).
- Implemented customer account freeze/unfreeze and user lock/unlock with immutable audit logging.

---

## Prompt Entry 5: Final End-to-End Development Verification & Security Boundary Audit

- **Date**: 2026-11-13
- **Task**: 11-Point Verification Audit & Security Isolation Testing
- **Category**: Verification, Security Auditing & Build Testing
- **Tool / Environment**: Node.js automated test runner, JUnit 5, Vite, Spring Boot

### Actual Prompt Summary
> "Perform a final end-to-end verification of the completed BalanceVault Admin Command Center across 11 specific checkpoints:
> 1. Sidebar navigation
> 2. Search, filters, modals, CSV export
> 3. Dashboard charts and real PostgreSQL data
> 4. Customer lock/unlock and account freeze/unfreeze
> 5. Transaction monitoring and suspicious flags
> 6. Audit log filters and SHA-256 CSV signing
> 7. Admin password change and logout
> 8. RBAC: CUSTOMER receives 403 for Admin APIs and AUDITOR remains read-only
> 9. Browser console & network verification
> 10. Customer workflows intact
> 11. Full backend tests and frontend build"

### Results & Findings
- Created automated test suite `verify_admin_command_center.js` executing real HTTP requests against PostgreSQL 18.
- Verified negative security boundaries:
  - `AUDITOR` attempting `POST /api/v1/admin/users/7/lock` received HTTP 403 Forbidden.
  - `CUSTOMER` attempting `GET /api/v1/admin/overview` received HTTP 403 Forbidden.
  - `CUSTOMER` attempting `GET /api/v1/audit-logs` received HTTP 403 Forbidden.
- All 79 backend tests passed with 0 failures (`mvnw.cmd test -o`).
- Frontend production build (`pnpm run build`) succeeded with 0 errors.

---

## Prompt Entry 6: UI Refinement & Decorative Element Removal

- **Date**: 2026-11-13
- **Task**: Interface Simplification & Unused Element Cleanup
- **Category**: Frontend UI/UX Refinement
- **Tool / Environment**: React, Tailwind CSS, Vite

### Actual Prompt Summary
> "Remove KYC Onboarding, Public Landing Page Preview, 256-Bit TLS security pill badge, KYC card from customer profile, and all decorative pill badges across customer and admin headers."

### Results & Findings
- Decorative header pills (e.g., `Customer Vault Command`, `Master Node Active`, `PostgreSQL Checkpoint Active`) cluttered page headers.
- KYC onboarding was not part of the active operational scope.

### Correction & Resolution
- Removed `Customer Vault Command` pill badge from `CustomerDashboard.tsx`.
- Removed `Master Node Active` pill badge from `AdminDashboard.tsx`.
- Removed `PostgreSQL Checkpoint Active` pill badge from `AccountDetailsPage.tsx`.
- Removed `Registered Customers` pill badge from `AdminUserManagementPage.tsx`.
- Removed `PostgreSQL Trigger Enforced` pill badge from `AdminAuditLogPage.tsx`.
- Removed `Customer Onboarding` pill badge from `RegisterPage.tsx`.
- Removed `Lavender Dream Pastel Theme Live` pill badge from `LandingPage.tsx`.
- Removed unused `AdminOnboardingPage.tsx` route from `App.tsx` and cleaned types in `types/index.ts`.
- Verified production frontend build compiled cleanly in 34 seconds with zero errors.

