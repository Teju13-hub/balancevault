# BalanceVault — Security Architecture, Threat Model & Controls

This document details the threat modeling, cryptographic controls, defensive implementations, and security guarantees built into BalanceVault.

---

## 1. Threat Model & Assets

### 1.1 Protected Assets
- **Financial Balance Integrity**: Prevention of counterfeit balance generation, unauthorized withdrawals, or double spending.
- **Append-Only Ledger Rows**: Guaranteeing that once written, double-entry financial transactions and audit entries cannot be altered or purged.
- **Customer Confidentiality & Tenant Isolation**: Preventing customers from observing or accessing another customer's balance, transaction statements, or personal information.
- **Administrative Capabilities**: Protecting high-privilege operations (account freeze, user suspension, reconciliation queries) from unauthorized access.
- **Credentials & Cryptographic Secrets**: Protecting user passwords, password recovery tokens, and HMAC-SHA256 signing keys.

### 1.2 Trust Boundaries
- **Untrusted Internet Client $\longrightarrow$ API Gateway / Filter Chain**: Public internet requests must pass through rate limiters, CORS configuration, and JWT authentication filters.
- **Authenticated Principal $\longrightarrow$ Resource Access**: Users can only access accounts and transaction records that they explicitly own.
- **Privileged Roles Boundary**: `ACCOUNT_HOLDER` cannot access `/api/v1/admin/*` or `/api/v1/audit-logs`. `AUDITOR` has strictly read-only access to `/api/v1/audit-logs` and cannot invoke write mutations.
- **Application Server $\longrightarrow$ Database Engine**: Even if an application vulnerability exists, database schema constraints and trigger functions enforce ledger immutability and non-negative balances independently.

---

## 2. Threat Analysis & Defensive Implementations

| Threat Category | Potential Attack Vector | BalanceVault Defense & Control |
|---|---|---|
| **Authentication Threats** | Credential stuffing, brute-force dictionary attacks | **5-Attempt / 15-Minute Lockout**: Tracks consecutive failed attempts in `users.failed_login_attempts`. On 5 failures, locks account for 15 minutes (`users.locked_until`). Token bucket rate limiting applied per IP. |
| **Credential Storage** | Database compromise exposing passwords | **BCrypt Hash with Salt**: Passwords hashed using Spring Security's `BCryptPasswordEncoder` (work factor 10). Plaintext passwords are never stored, logged, or serialized. |
| **Privilege Escalation** | Customer attempting administrative APIs | **Role-Based Authorization (@PreAuthorize)**: Strict Spring Security filters check JWT claims. Custom `AccessDeniedHandler` intercepts unauthorized access and returns HTTP 403 Forbidden without stack traces. |
| **Double Spending / Race Conditions** | Simultaneous concurrent transfer requests | **Pessimistic Row Locking in Ascending Order**: Acquires `PESSIMISTIC_WRITE` locks (`SELECT ... FOR UPDATE`) sorted by primary key ID (`Math.min`, `Math.max`), eliminating race conditions and deadlocks. |
| **Transaction Replay** | Submitting the identical transfer multiple times | **Cryptographic Idempotency Guard**: 24-hour cache in `idempotency_records` table storing UUID/hash. Duplicate requests within 24 hours return the original result without re-executing. |
| **Balance Sheet Discrepancy** | Unilateral credit or debit without balancing leg | **Atomically Paired Double-Entry**: Every transfer writes matching `DEBIT` and `CREDIT` records in a single database transaction (`@Transactional`). Database check constraints enforce non-negative balances. |
| **Ledger Record Tampering** | Malicious DB admin or SQLi modifying historical records | **PostgreSQL Immutability Triggers**: `BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE` triggers on `ledger_entries`, `transfers`, and `audit_log` raise PostgreSQL exceptions and abort transactions. |
| **SQL Injection** | Malicious payload in search, account, or transfer inputs | **Parameterized Queries & Spring Data JPA**: 100% of queries use Hibernate parameterized statements or criteria builders. No raw SQL string concatenation is used. |
| **Information Leakage** | Exposing stack traces, SQL errors, or internal paths | **Global Exception Handler**: Intercepts unhandled exceptions and returns standardized error payloads with generic messages, suppressing stack traces. |
| **Audit Log Tampering** | Deleting audit entries to cover illicit actions | **Immutable Audit Trail**: Audit table has trigger-enforced append-only constraints. Client exports include SHA-256 digest calculations for tamper detection. |

---

## 3. Cryptographic Controls

### 3.1 Password Recovery Security
- When a user requests password recovery, `PasswordResetService` generates a 64-character hexadecimal cryptographically secure random token using `java.security.SecureRandom`.
- The token is **never stored in plaintext** in the database. Instead, the application computes the SHA-256 hash:
  $$\text{token\_hash} = \text{SHA-256}(\text{raw\_token})$$
- The record in `password_reset_tokens` stores:
  - `token_hash`: Unique SHA-256 digest.
  - `expires_at`: Enforced 15-minute time-to-live (`now() + 15 minutes`).
  - `used`: Boolean flag set to `true` upon consumption.
  - `ip_address`: Client IP recorded for forensics.
- The reset endpoint validates:
  1. Hash exists and matches.
  2. `used == false` (single use only).
  3. `expires_at > now()` (expiration check).
- Once consumed, the token is permanently invalidated.

### 3.2 Stateless JWT Tokens
- Tokens are signed using HMAC-SHA256 with a 256-bit secret key.
- Tokens expire in 24 hours (`86,400,000 ms`).
- Stored on the client in memory and session storage; cleared immediately on logout.

---

## 4. Remaining Risks & Operational Limitations

1. **SMTP Transport Encryption**: In this development configuration, email dispatches are processed by `EmailServiceImpl` and logged to the application console. In production, an authenticated TLS SMTP provider (e.g., AWS SES, Postmark) must be configured with DKIM and SPF verification.
2. **Key Rotation**: JWT signing keys are managed via environment variables. Enterprise deployments should transition to a hardware security module (HSM) or dynamic key rotation via AWS Secrets Manager / HashiCorp Vault.
3. **Database Superuser Access**: Database triggers prevent modification from application connections. However, a database superuser (`postgres`) with direct terminal access could theoretically disable triggers. Production environments must restrict superuser access and employ write-once-read-many (WORM) storage for audit archives.

