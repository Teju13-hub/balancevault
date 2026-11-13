# BalanceVault — Testing, Verification & Quality Assurance Report

This document records the automated testing suite, manual verification procedures, negative security boundary testing, and production build results for BalanceVault.

---

## 1. Automated Test Suite Summary

The backend automated test suite is implemented using JUnit 5, Mockito, AssertJ, and Spring Boot Test with an H2 in-memory test database.

### 1.1 Test Execution Command
```powershell
.\mvnw.cmd test -o
```

### 1.2 Automated Test Results Overview
```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.ledgerline.security.JwtServiceTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.AccountAccessTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.AuthenticationAndIdentityTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.DatabaseIntegrityTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.LedgerLineApplicationTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.PasswordResetAndAdminTest
[INFO] Tests run: 13, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.PhaseVerificationTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.SecurityAuthorizationTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.SecurityHardeningTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.ledgerline.TransferEngineTest
[INFO] Tests run: 17, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] Results:
[INFO] Tests run: 79, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time: 03:10 min
[INFO] ------------------------------------------------------------------------
```

### 1.3 Detailed Automated Test Coverage by Class

| Test Class | Test Count | Status | Key Verifications Covered |
|---|:---:|:---:|---|
| `TransferEngineTest` | 17 | **PASS** | Double-entry balancing, concurrent transfer execution, deadlock-free row locking, idempotency key collision rejection, insufficient funds rejection, self-transfer prevention. |
| `PasswordResetAndAdminTest` | 13 | **PASS** | Initial admin bootstrap runner, secure password reset token generation, SHA-256 hash storage, 15-min token expiration, single-use consumption, token replay rejection. |
| `SecurityHardeningTest` | 10 | **PASS** | 5-attempt brute-force threshold, 15-minute lockout enforcement, token bucket rate limiter, malformed JWT rejection, expired JWT handling. |
| `AccountAccessTest` | 10 | **PASS** | Account ownership validation, multi-tenant customer isolation, non-owner lookup denial, customer statement access boundaries. |
| `DatabaseIntegrityTest` | 8 | **PASS** | PostgreSQL trigger validation: append-only block on `UPDATE`, `DELETE`, and `TRUNCATE` for `ledger_entries` and `audit_log`; check constraints on non-negative balance and positive amount. |
| `PhaseVerificationTest` | 7 | **PASS** | End-to-end multi-step workflow verification across registration, deposit, transfer, withdrawal, and ledger generation. |
| `AuthenticationAndIdentityTest` | 7 | **PASS** | Customer registration flow, email OTP generation, OTP verification, login credential matching, JWT claims. |
| `SecurityAuthorizationTest` | 4 | **PASS** | Role-based authorization boundaries: customer denied access to admin endpoints (`403 Forbidden`), unauthenticated access denied (`401 Unauthorized`). |
| `JwtServiceTest` | 3 | **PASS** | HMAC-SHA256 signature verification, claims extraction (username, role, userId), token expiration calculations. |
| `LedgerLineApplicationTest` | 1 | **PASS** | Complete Spring Boot application context load test. |

---

## 2. Frontend Production Build & TypeScript Verification

### 2.1 Build Execution Command
```powershell
cd frontend
pnpm run build
```

### 2.2 Build Results
```text
> balancevault-frontend@1.0.0 build G:\My Drive\snovys\frontend
> tsc -b && vite build

vite v6.4.6 building for production...
transforming...
✓ 1608 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                           1.17 kB │ gzip:  0.67 kB
dist/assets/vault-illustration-CxfxD7bE.png             437.09 kB
dist/assets/balancevault-illustration-B69MqJAF.png    1,391.64 kB
dist/assets/balancevault-clean-backdrop-BUXbk8wX.jpg  1,716.63 kB
dist/assets/index-DZHeM98V.css                           55.43 kB │ gzip:  9.59 kB
dist/assets/index-jSVoSgn5.js                           395.95 kB │ gzip: 93.33 kB
✓ built in 34.19s (0 TypeScript errors)
```

---

## 3. End-to-End Live Verification (Manual & Scripted)

All checks below were executed against the live application running on PostgreSQL 18, Spring Boot 3.3.5 (Port 8081), and React/Vite (Port 5173).

| Category | Verification Test Case | Input / Action | Expected Result | Actual Result | Status |
|---|---|---|---|---|:---:|
| **Admin Operations** | Administrative Login | `admin` / `Admin123@` | HTTP 200, JWT returned with role `ADMIN` | HTTP 200, JWT valid | **PASS** |
| **Admin Operations** | User Directory & Portfolio | `GET /api/v1/admin/users` | List of 9 users with account counts & balances | Returned 9 users with full details | **PASS** |
| **Admin Operations** | Customer Account Lock | `POST /api/v1/admin/users/7/lock` | User 7 set to `SUSPENDED` / `locked = true` | Status updated; login rejected with 401 | **PASS** |
| **Admin Operations** | Customer Account Unlock | `POST /api/v1/admin/users/7/unlock` | User 7 set to `ACTIVE` / `locked = false` | Status updated; login succeeds | **PASS** |
| **Admin Operations** | Account Freeze | `POST /api/v1/admin/accounts/12/freeze` | Account `status = 'FROZEN'` | Transfers from account blocked | **PASS** |
| **Admin Operations** | System Vault Protection | `POST /api/v1/admin/accounts/1/freeze` (`SYSTEM-CASH-INR`) | Block freeze attempt on core vault | HTTP 403 Forbidden returned | **PASS** |
| **Admin Operations** | Transaction Anomaly Detection | `GET /api/v1/admin/transactions` | Unified double-entry stream; high value flagged | 9 transactions; amounts > 50,000 flagged | **PASS** |
| **Admin Operations** | Cryptographic Reconciliation | `GET /api/v1/admin/reconciliation` | Total debits equal total credits, variance 0 | `status: BALANCED`, debits=credits=10,326 | **PASS** |
| **Negative Security** | Auditor Write Denial | Auditor `POST /api/v1/admin/users/7/lock` | Deny write mutation to auditor | HTTP 403 Forbidden | **PASS** |
| **Negative Security** | Auditor Admin Overview Denial | Auditor `GET /api/v1/admin/overview` | Deny admin overview to auditor | HTTP 403 Forbidden | **PASS** |
| **Negative Security** | Auditor Audit Trail Access | Auditor `GET /api/v1/audit-logs` | Permit read-only audit log inspection | HTTP 200 OK (146 records returned) | **PASS** |
| **Negative Security** | Customer Admin API Denial | Customer `GET /api/v1/admin/overview` | Deny admin overview to customer | HTTP 403 Forbidden | **PASS** |
| **Negative Security** | Customer Audit Trail Denial | Customer `GET /api/v1/audit-logs` | Deny audit log inspection to customer | HTTP 403 Forbidden | **PASS** |
| **Customer Banking** | Customer Login | `teju2113` / `Teju2113@` | HTTP 200, JWT with role `ACCOUNT_HOLDER` | HTTP 200, JWT valid | **PASS** |
| **Customer Banking** | Customer Account Access | `GET /api/v1/accounts` | Return only customer's own vault | 1 account returned (`AC9698818053`) | **PASS** |
| **Customer Banking** | Currency Mismatch Protection | Transfer between INR and USD | Reject with clear error | HTTP 422 with clear mismatch message | **PASS** |
| **Customer Banking** | Password Self-Service Recovery | Request reset $\to$ submit token $\to$ new password | Password updated, token invalidated | HTTP 200, login verified with new password | **PASS** |

