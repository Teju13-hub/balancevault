# BalanceVault — System Architecture & Technical Design

This document details the software architecture, design patterns, security frameworks, and data flows of the BalanceVault financial ledger system.

---

## 1. High-Level Architectural Overview

BalanceVault employs a decoupled client-server architecture designed for high assurance, financial accuracy, and strict multi-tenant data isolation.

```text
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|                                                                                 |
|   React 18.3 + TypeScript 5.6 + Vite + Tailwind CSS (Lavender Dream Design)     |
|   - Customer Portal (Portfolios, Transfers, Statements, Profile)                |
|   - Admin Command Center (Telemetry, Account Registry, Fraud Monitor, Locks)    |
|   - Compliance Auditor Portal (Immutable Audit Trail, Signed CSV Exports)       |
+----------------------------------------+----------------------------------------+
                                         |
                                         | HTTPS / REST (JSON + Bearer JWT)
                                         v
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|                                                                                 |
|                        Spring Boot 3.3.5 / Java 21 LTS                          |
|                                                                                 |
|   [ Security & Filter Chain ]                                                   |
|   ├── RateLimitingFilter (Token bucket per IP / Action)                         |
|   ├── JwtAuthenticationFilter (HMAC-SHA256 Token Extraction & Validation)       |
|   └── RoleBasedAccessControl (@PreAuthorize("hasRole(...)"))                    |
|                                                                                 |
|   [ Controllers & Presentation Layer ]                                          |
|   ├── AuthController (/api/v1/auth/*)                                           |
|   ├── AccountController (/api/v1/accounts/*)                                    |
|   ├── TransferController (/api/v1/transfers/*)                                  |
|   ├── AdminController (/api/v1/admin/*)                                         |
|   └── AuditLogController (/api/v1/audit-logs)                                   |
|                                                                                 |
|   [ Service & Domain Logic ]                                                    |
|   ├── TransferService (Double-entry engine, pessimistic locking, idempotency)   |
|   ├── AccountService (Segregated vault creation, balance checks, owner bounds)  |
|   ├── PasswordResetService (Cryptographic token lifecycle, BCrypt hashing)      |
|   ├── ReconciliationService (Algebraic balance sheet equality verification)    |
|   └── AuditService (Asynchronous & transactional audit event emission)          |
+----------------------------------------+----------------------------------------+
                                         |
                                         | JDBC / HikariCP Pool
                                         v
+---------------------------------------------------------------------------------+
|                                 DATABASE TIER                                   |
|                                                                                 |
|                                PostgreSQL 18.x                                  |
|                                                                                 |
|   [ Schema & Flyway Migrations V1-V8 ]                                          |
|   ├── users (Credentials, roles, failed attempts, account lockout timestamps)   |
|   ├── accounts (NUMERIC(19,4) balances, currencies, status, system/customer)   |
|   ├── transfers (Two-legged movements, reference IDs, idempotency keys)         |
|   ├── ledger_entries (Append-only paired debits and credits)                    |
|   ├── idempotency_records (24-hour cryptographic replay cache)                  |
|   ├── audit_log (Immutable audit trail of authentication and admin actions)     |
|   └── password_reset_tokens (SHA-256 hashed single-use recovery tokens)         |
|                                                                                 |
|   [ Immutability & Constraint Triggers ]                                        |
|   ├── prevent_modification_or_deletion() -> Blocks UPDATE and DELETE on ledgers |
|   └── prevent_table_truncation() -> Blocks TRUNCATE operations                  |
+---------------------------------------------------------------------------------+
```

---

## 2. Frontend Architecture

### 2.1 Component Structure & State
The frontend is built with React 18 using TypeScript with strict type checking. It follows a modular component hierarchy:
- **Presentation Components**: Reusable, atomic UI elements (`Button`, `InputField`, `DashboardCard`, `StatCard`, `StatusBadge`, `Modal`).
- **Layout Shell**:
  - `Sidebar.tsx`: Role-aware responsive navigation sidebar highlighting accessible screens for `ACCOUNT_HOLDER`, `ADMIN`, or `AUDITOR`.
  - `Topbar.tsx`: Global search, active profile initials avatar, notifications dropdown, and responsive menu trigger.
- **Screen Controllers**:
  - `CustomerDashboard.tsx`: Displays portfolio summary, active vault balances, and recent transaction history.
  - `MoneyTransferPage.tsx`: Interactive transfer flow with live recipient account verification and currency validation.
  - `AccountDetailsPage.tsx`: Detailed transaction ledger with exportable CSV statements.
  - `AdminDashboard.tsx`: Tabbed management center providing operational telemetry, vault management, fraud inspection, and system metrics.
  - `AdminUserManagementPage.tsx`: Searchable customer directory with account portfolios and administrative locking mechanisms.
  - `AdminAuditLogPage.tsx`: Immutable audit log inspector with SHA-256 signed CSV report exports.
  - `SettingsPage.tsx`: Authenticated user credentials, profile display, and password updates.

### 2.2 Routing & Navigation
A centralized navigation coordinator in `App.tsx` controls screen transitions based on state:
```typescript
export type Screen =
  | 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password'
  | 'dashboard' | 'accounts' | 'transfer' | 'transactions' | 'profile' | 'settings'
  | 'admin-dashboard' | 'admin-users' | 'admin-accounts' | 'admin-transactions'
  | 'admin-security' | 'admin-reports' | 'admin-audit';
```
When an unauthenticated principal accesses the app, routing defaults to `'login'`. When an authenticated principal logs in, routing resolves based on their assigned role:
- `ADMIN` $\rightarrow$ `'admin-dashboard'`
- `AUDITOR` $\rightarrow$ `'admin-audit'`
- `ACCOUNT_HOLDER` $\rightarrow$ `'dashboard'`

---

## 3. Backend Layered Architecture

The Spring Boot backend enforces clear separation of concerns across four primary layers:

### 3.1 Controller (Web) Layer
Handles HTTP requests, extracts parameters, applies `@Valid` request body validation, and maps domain exceptions to structured RFC 7807 problem details or custom `ErrorResponse` DTOs.
- Protected by method-level security: `@PreAuthorize("hasRole('ADMIN')")`, `@PreAuthorize("hasRole('AUDITOR')")`, or authenticated user bounds.

### 3.2 Service (Business Logic) Layer
Encapsulates transaction boundaries (`@Transactional`) and financial business rules:
- Validates that transfer source and destination accounts belong to the same currency.
- Enforces non-negative balance checks before committing transfers.
- Computes running balances and pairs equal debit and credit ledger rows.
- Coordinates audit event creation for sensitive actions.

### 3.3 Data Access (Repository) Layer
Spring Data JPA interfaces extending `JpaRepository`:
- Utilizes explicit JPQL queries with locking annotations (`@Lock(LockModeType.PESSIMISTIC_WRITE)`).
- Provides indexed lookup methods (e.g., `findByAccountNumber`, `findByUsername`, `findAllByOrderByCreatedAtDesc`).

### 3.4 Persistence & Entity Model
JPA entities map to normalized PostgreSQL relations:
- `User`: Identity, role, password hash, lockout state.
- `Account`: Currency, precision balance (`NUMERIC(19,4)`), type (`CUSTOMER` / `SYSTEM`), status (`ACTIVE` / `FROZEN`).
- `Transfer`: Financial transaction record with reference ID and idempotency key.
- `LedgerEntry`: Append-only debit or credit entry tied to an account and transfer.
- `AuditLog`: Immutable record of authentication and administrative events.
- `PasswordResetToken`: SHA-256 hashed single-use authorization token.

---

## 4. Authentication & Security Flow

### 4.1 Login & JWT Issuance
```text
Customer / Admin              AuthController               CustomUserDetailsService         JwtService
       |                             |                                 |                        |
       |--- POST /api/v1/auth/login ->|                                |                        |
       |    { identifier, password } |                                 |                        |
       |                             |--- loadUserByUsername() ------->|                        |
       |                             |<-- UserDetails (BCrypt Hash) ---|                        |
       |                             |                                 |                        |
       |                             |-- Authenticate via BCrypt -----|                        |
       |                             |   (If 5 fails -> Lock 15 min)   |                        |
       |                             |                                 |                        |
       |                             |--- generateToken(User) --------------------------------->|
       |                             |<-- Signed JWT (HMAC-SHA256) ----------------------------|
       |<-- HTTP 200 OK -------------|
       |    { token, role, user }    |
```

1. **Authentication Attempt**: The client submits username/email and plaintext password to `/api/v1/auth/login`.
2. **Brute-Force Guard**: `AuthService` checks `user.getLockedUntil()`. If locked, authentication is rejected immediately with HTTP 401.
3. **Password Verification**: Spring Security compares the input against the stored BCrypt hash.
   - On failure: `failed_login_attempts` increments. If attempts reach 5, `locked_until` is set to `now() + 15 minutes`.
   - On success: `failed_login_attempts` resets to 0, and `AuditService` logs `LOGIN_SUCCESS`.
4. **Token Generation**: `JwtService` issues an HMAC-SHA256 token containing:
   - `sub`: Username
   - `role`: Role enum (`ACCOUNT_HOLDER`, `ADMIN`, `AUDITOR`)
   - `userId`: Numeric database ID
   - `iat` / `exp`: Timestamps (24-hour expiration)

---

## 5. Financial Transaction & Double-Entry Flow

### 5.1 Concurrency & Deadlock Prevention Strategy
When transferring funds between Account A and Account B, locking both accounts simultaneously can produce deadlocks if another thread transfers funds from Account B to Account A at the same time:
$$\text{Thread 1: Locks A, waits for B} \quad \longleftrightarrow \quad \text{Thread 2: Locks B, waits for A}$$

**BalanceVault Solution**:
Accounts are always locked in strictly ascending ID order:
```java
Long firstId = Math.min(sourceId, destId);
Long secondId = Math.max(sourceId, destId);

Account first = accountRepository.findByIdWithLock(firstId);
Account second = accountRepository.findByIdWithLock(secondId);
```
Because all threads acquire locks in the identical order, cyclic lock dependencies cannot occur, mathematically preventing deadlocks.

### 5.2 Double-Entry Lifecycle
```text
Client                   TransferService               AccountRepository            LedgerRepository
  |                             |                              |                           |
  |--- POST /api/v1/transfers ->|                              |                           |
  |    { src, dst, amount, key }|                              |                           |
  |                             |-- Check Idempotency Key ----|                           |
  |                             |                              |                           |
  |                             |-- Lock Accounts (min, max) ->|                           |
  |                             |<-- Accounts Locked ----------|                           |
  |                             |                              |                           |
  |                             |-- Verify Same Currency ------|                           |
  |                             |-- Verify Sufficient Balance -|                           |
  |                             |                              |                           |
  |                             |-- src.balance -= amount ---->|                           |
  |                             |-- dst.balance += amount ---->|                           |
  |                             |                              |                           |
  |                             |-- Create DEBIT Ledger Entry ---------------------------->|
  |                             |-- Create CREDIT Ledger Entry --------------------------->|
  |                             |                              |                           |
  |                             |-- Create Transfer Record ----|                           |
  |<-- HTTP 201 Created --------|
```

1. **Idempotency Guard**: `TransferService` checks if `idempotency_key` has already been recorded in `idempotency_records`. If found, the previously recorded response is returned without reprocessing.
2. **Account Locking**: Source and destination accounts are acquired using `SELECT ... FOR UPDATE` in ascending ID order.
3. **Pre-Condition Validation**:
   - Both accounts must have status `ACTIVE` (not `FROZEN` or `CLOSED`).
   - Currency strings must match exactly (`source.getCurrency().equals(destination.getCurrency())`).
   - Source account must satisfy `source.getBalance().compareTo(amount) >= 0`.
4. **Balance Adjustment**:
   - `source.setBalance(source.getBalance().subtract(amount))`
   - `destination.setBalance(destination.getBalance().add(amount))`
5. **Ledger Row Insertion**:
   - Debit: `entry_type = 'DEBIT'`, `amount = amount`, `balance_after = source.getBalance()`
   - Credit: `entry_type = 'CREDIT'`, `amount = amount`, `balance_after = destination.getBalance()`
6. **Commit**: The transaction commits atomically. If any error occurs, the entire transaction rolls back cleanly.

---

## 6. Admin Command Center Architecture

The Admin Command Center integrates operational oversight, fraud detection, and system telemetry into a single unified API and UI interface:

```text
Admin Dashboard UI
   ├── Overview & Telemetry  ---> GET /api/v1/admin/overview
   │                              ├── Live user counts (total, active, locked)
   │                              ├── Volume aggregates (deposits, withdrawals, transfers)
   │                              └── 14-day rolling activity curves
   ├── User Directory        ---> GET /api/v1/admin/users
   │                              ├── Search by name, username, email, account
   │                              ├── Lock / Unlock user (POST /api/v1/admin/users/{id}/lock)
   │                              └── Inspect user portfolios and total balances
   ├── Account Registry      ---> GET /api/v1/admin/accounts
   │                              ├── Filter by status (ACTIVE / FROZEN) and currency
   │                              ├── Freeze account (POST /api/v1/admin/accounts/{id}/freeze)
   │                              └── System vault protection (Blocks freezing SYSTEM vaults)
   ├── Transaction Stream    ---> GET /api/v1/admin/transactions
   │                              ├── Unified paired ledger stream (DEP-, WTH-, TRF-)
   │                              └── High-value anomaly detection (> 50,000 INR / 10,000 USD)
   ├── Security Telemetry    ---> GET /api/v1/admin/security/telemetry
   │                              ├── Brute-force defense status & lockout tallies
   │                              └── Idempotency and database trigger integrity check
   ├── Financial Reports     ---> GET /api/v1/admin/reports
   │                              ├── Currency volume distributions (INR vs USD)
   │                              └── Cryptographic CSV report download with SHA-256 digest
   └── Reconciliation        ---> GET /api/v1/admin/reconciliation
                                  └── Real-time validation that debits == credits (variance == 0)
```

