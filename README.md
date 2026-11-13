# BalanceVault — High-Assurance Financial Ledger & Banking Platform

BalanceVault is an institutional-grade, full-stack financial ledger and core banking application designed to provide cryptographic mathematical integrity, append-only transaction immutability, and role-based operational control. Built on a double-entry bookkeeping architecture, BalanceVault guarantees that every debit is matched with an equal credit, preventing negative balances, race conditions, and ledger divergence.

---

## 1. Problem Statement & Objectives

Traditional web-based financial applications often suffer from critical data-integrity flaws:
1. **Floating-point inaccuracies**: Using standard float or double types leads to fractional cent/paisa drift over millions of operations.
2. **Race conditions & concurrency hazards**: Simultaneous deposit, withdrawal, or transfer requests can exploit read-modify-write windows to create money out of thin air or cause overdrafts.
3. **Destructive mutations**: Overwriting account balances in-place leaves no audit trail, making fraud detection and financial reconciliation impossible.
4. **Weak access boundaries**: Inadequate separation between standard customer capabilities, administrative powers, and compliance audit functions.

### Objectives
- **Zero Financial Discrepancies**: Maintain strict cryptographic and algebraic balance sheet equality ($\sum \text{Debits} = \sum \text{Credits}$) across all accounts.
- **Append-Only Immutability**: Enforce database-level schema triggers prohibiting `UPDATE` and `DELETE` queries on core financial ledgers and security logs.
- **Strict Concurrency Control**: Employ database-level pessimistic locking (`PESSIMISTIC_WRITE`) ordered by primary key to eliminate deadlocks and race conditions during concurrent money movements.
- **Cryptographic Idempotency**: Reject duplicate submissions using 24-hour cryptographic idempotency keys.
- **Rigorous Multi-Tenant Role Isolation**: Implement granular Spring Security role hierarchies distinguishing `ACCOUNT_HOLDER` (Customer), `ADMIN` (Administrative Operator), and `AUDITOR` (Read-only Compliance Examiner).

---

## 2. Core Features

### Financial & Banking Operations
- **Double-Entry Ledger Engine**: Every customer transfer generates paired, immutable `DEBIT` and `CREDIT` ledger records.
- **System Cash Inflow/Outflow Vaults**: Deposits and withdrawals flow through segregated system reserve vaults (`SYSTEM-CASH-INR` and `SYSTEM-CASH`) to ensure complete asset tracking.
- **Arbitrary-Precision Balance Management**: All balances and currency movements are processed using `BigDecimal` and stored as PostgreSQL `NUMERIC(19, 4)` columns.
- **Deadlock-Free Row-Level Locking**: Account pairs are locked in strictly ascending ID order (`min(src, dst)` followed by `max(src, dst)`) before balance updates occur.
- **Same-Currency Transfer Validation**: Rejects mismatched currency transfers at both the frontend validation layer and backend business service level.

### Identity & Authentication
- **Registration with Email OTP Verification**: New customers register with multi-step email verification, rate-limited dispatch, and 5-attempt expiration policies.
- **Stateless JWT Security**: High-entropy HMAC-SHA256 tokens carry principal identity, account authorities, and role claims.
- **Self-Service Password Recovery**: Secure password reset flow utilizing cryptographic 64-character SHA-256 tokens with a 15-minute time-to-live and single-use enforcement.
- **Brute-Force Attack Mitigation**: Automatic 15-minute account lockout triggered after 5 consecutive failed authentication attempts.

### Admin Command Center & Compliance
- **Real-Time Operational Telemetry**: Dashboard surfacing total customers, segregated vaults, deposit/withdrawal/transfer volume, and 14-day growth curves backed directly by PostgreSQL.
- **Customer Directory & Security Controls**: Administrative capabilities to search customer profiles, view account portfolios, and apply administrative security locks (`SUSPENDED`).
- **Vault Account Management**: Freeze and unfreeze customer accounts; core system cash vaults are strictly protected against administrative suspension.
- **Transaction Stream & Suspicious Detection**: Automated fraud inspection flagging high-value transactions (> ₹50,000 / $10,000) with explainable risk reasons.
- **Real-Time Ledger Balance Reconciliation**: Administrative verification endpoint checking that total ledger debits match total credits with zero variance across all database accounts.
- **Immutable Audit Trail & Cryptographic CSV Export**: Filterable security audit logs with client-side SHA-256 digest calculation for verified offline audit archiving.

---

## 3. Technology Stack

### Backend
- **Language**: Java 21 (LTS)
- **Framework**: Spring Boot 3.3.5
- **Security**: Spring Security 6.3 with stateless JWT filter
- **Persistence**: Spring Data JPA / Hibernate ORM 6.5
- **Database Migrations**: Flyway 10.15 (8 versioned SQL migrations)
- **Database Engine**: PostgreSQL 18.x
- **Testing**: JUnit 5, Mockito, AssertJ, H2 in-memory test database

### Frontend
- **Framework**: React 18.3 with TypeScript 5.6
- **Build Tool**: Vite 6.4
- **Styling**: Tailwind CSS 3.4 (Customized Lavender Dream financial palette)
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API with centralized bearer token injection

---

## 4. Repository & Project Structure

```text
balancevault/
├── pom.xml                               # Maven project configuration & dependencies
├── mvnw / mvnw.cmd                       # Maven wrapper binaries
├── start-backend.ps1                     # PowerShell backend launcher (Port 8081)
├── .env.example                          # Environment variable configuration template
├── README.md                             # Primary project documentation
├── PROMPTS.md                            # AI-assisted development prompt log
├── docs/                                 # Architectural & technical documentation
│   ├── ARCHITECTURE.md                   # System design & request lifecycle
│   ├── API_DOCUMENTATION.md              # REST API endpoint reference
│   ├── SECURITY.md                       # Threat model & cryptographic controls
│   ├── TESTING.md                        # Automated test results & manual audit
│   └── DATABASE.md                       # PostgreSQL schema & Flyway migrations
├── src/                                  # Spring Boot backend source code
│   ├── main/
│   │   ├── java/com/ledgerline/
│   │   │   ├── controller/               # REST API endpoints (Admin, Auth, Account, Transfer, etc.)
│   │   │   ├── dto/                      # Data Transfer Objects & validation schemas
│   │   │   ├── exception/                # Global exception handling & error mappers
│   │   │   ├── model/                    # JPA Entities (User, Account, Transfer, LedgerEntry, etc.)
│   │   │   ├── repository/               # Spring Data JPA repositories
│   │   │   ├── security/                 # JWT filters, UserDetailsService, Admin provisioner
│   │   │   │   └── ratelimit/            # Token bucket rate limiting implementation
│   │   │   └── service/                  # Business logic, transfer engine, reconciliation
│   │   └── resources/
│   │       ├── application.yml           # Backend application properties
│   │       └── db/migration/             # Versioned Flyway migrations (V1 to V8)
│   └── test/java/com/ledgerline/         # Comprehensive JUnit 5 automated test suite
└── frontend/                             # React TypeScript Vite frontend
    ├── package.json                      # Node dependencies & script definitions
    ├── vite.config.ts                    # Vite config with backend proxy on port 8081
    ├── tailwind.config.js                # Lavender Dream color palette tokens
    └── src/
        ├── components/                   # Reusable UI widgets (Sidebar, Topbar, StatCard, etc.)
        ├── screens/                      # Screen views (CustomerDashboard, AdminDashboard, etc.)
        ├── services/                     # Typed API client services
        └── types/                        # TypeScript domain interfaces
```

---

## 5. Prerequisites

Before running the application, ensure the following software is installed on your workstation:
1. **Java Development Kit (JDK)**: Version 21 or higher.
   ```powershell
   java -version
   ```
2. **Node.js**: Version 18.x or higher, with `pnpm` or `npm`.
   ```powershell
   node -v
   pnpm -v
   ```
3. **PostgreSQL**: Version 15 or higher (tested against PostgreSQL 18).
   ```powershell
   psql --version
   ```

---

## 6. Environment Configuration

1. Copy `.env.example` in the project root to create your local `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Configure your local parameters inside `.env`:
   ```env
   # PostgreSQL Connection
   DB_URL=jdbc:postgresql://localhost:5432/ledgerline_db
   DB_USERNAME=ledgerline_app
   DB_PASSWORD=your_secure_postgres_password

   # JWT Secret Key (minimum 32 characters / 256 bits)
   JWT_SECRET=your_secure_random_jwt_secret_at_least_32_characters_long

   # Server Port
   PORT=8081
   ```

---

## 7. Database Initialization

1. Connect to your PostgreSQL instance and create the database and user:
   ```sql
   CREATE DATABASE ledgerline_db;
   CREATE USER ledgerline_app WITH ENCRYPTED PASSWORD 'your_secure_postgres_password';
   GRANT ALL PRIVILEGES ON DATABASE ledgerline_db TO ledgerline_app;
   ```
2. On backend startup, **Flyway** will automatically run migrations `V1` through `V8` in sequence:
   - `V1`: Core tables (`users`, `accounts`, `ledger_entries`, `audit_log`) and append-only triggers.
   - `V2`: System accounts, `SYSTEM-CASH` (USD), and `TRUNCATE` prevention triggers.
   - `V3`: Financial `transfers` table, `idempotency_records`, and positive amount constraints.
   - `V4`: User full name column.
   - `V5`: `email_verifications` table, account lockout counters, and account status columns.
   - `V6`: Seed `SYSTEM-CASH-INR` and configure default account currency to `INR`.
   - `V7`: Operational administrator credentials configuration.
   - `V8`: `password_reset_tokens` table with cryptographic SHA-256 hash storage.

---

## 8. Running the Application

### Starting the Backend
From the project root directory:
```powershell
# Using the provided PowerShell script
.\start-backend.ps1

# Or directly via the Maven wrapper
.\mvnw.cmd spring-boot:run
```
The backend initializes on port `8081`. Verify the health endpoint:
```powershell
curl http://localhost:8081/api/v1/health
```

### Starting the Frontend
From the `frontend/` directory:
```powershell
cd frontend
pnpm install
pnpm run dev
```
The frontend dev server launches on `http://localhost:5173`. Requests to `/api/*` are automatically proxied to the backend at `http://localhost:8081`.

---

## 9. Testing & Build Verification

### Backend Automated Test Suite
Run all 79 automated unit and integration tests:
```powershell
.\mvnw.cmd test -o
```
*Expected Result:*
```text
[INFO] Results:
[INFO] Tests run: 79, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Frontend Production Build
Compile TypeScript and bundle production assets:
```powershell
cd frontend
pnpm run build
```
*Expected Result:*
```text
✓ built in ~35s (0 TypeScript errors)
```

---

## 10. Operational Limitations & Boundaries

1. **Single-Currency Transfers**: Inter-account transfers currently require identical currencies (e.g., INR to INR). Cross-currency FX conversion is deliberately disabled to preserve deterministic accounting balance.
2. **Local Email Simulation**: Password reset and registration OTP codes are recorded in database verification tables (`email_verifications`, `password_reset_tokens`) and logged via `EmailService`. For production, integrate with AWS SES, SendGrid, or an SMTP relay.
3. **Immutable Ledgers**: Records in `ledger_entries` cannot be modified or deleted. Erroneous transactions must be reversed via compensatory double-entry transactions.

