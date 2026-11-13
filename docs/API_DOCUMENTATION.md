# BalanceVault — REST API Reference Documentation

This document describes all implemented REST endpoints in the BalanceVault banking backend. All endpoints are prefixed with `/api/v1`.

---

## 1. Authentication & Identity APIs (`/api/v1/auth`)

### 1.1 Customer Registration
- **Endpoint**: `POST /api/v1/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123@",
    "fullName": "John Doe",
    "initialDeposit": 1000.00
  }
  ```
- **Validation**:
  - `username`: 3–50 characters, alphanumeric with underscores/hyphens.
  - `email`: Valid RFC 5322 email format.
  - `password`: Minimum 8 characters, at least one uppercase, one lowercase, one digit, and one special character.
  - `initialDeposit`: Non-negative decimal (`>= 0`).
- **Response**: `201 Created`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "id": 10,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "role": "ACCOUNT_HOLDER"
  }
  ```

---

### 1.2 User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Access**: Public (Subject to Rate Limiting & Brute-Force Lockout)
- **Request Body**:
  ```json
  {
    "identifier": "johndoe",
    "password": "SecurePassword123@"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "id": 10,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "role": "ACCOUNT_HOLDER"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `"Invalid credentials"` or `"Account temporarily locked due to multiple failed login attempts. Please try again after 15 minutes."`

---

### 1.3 Request Password Reset (Forgot Password)
- **Endpoint**: `POST /api/v1/auth/forgot-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "If an active account exists for that email, password reset instructions have been dispatched."
  }
  ```
  *(Generic response prevents email enumeration attacks).*

---

### 1.4 Execute Password Reset
- **Endpoint**: `POST /api/v1/auth/reset-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "token": "64_character_hex_reset_token",
    "newPassword": "NewSecurePassword2026@"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Password has been successfully updated. You may now sign in with your new credentials."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `"Invalid or expired password reset token."` or `"Token has already been consumed."`

---

### 1.5 Authenticated Password Change
- **Endpoint**: `POST /api/v1/auth/change-password`
- **Access**: Authenticated (`ACCOUNT_HOLDER`, `ADMIN`, `AUDITOR`)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "currentPassword": "CurrentPassword123@",
    "newPassword": "UpdatedPassword456!",
    "confirmPassword": "UpdatedPassword456!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Password updated successfully"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `"New password and confirmation do not match."` or `"Current password does not match."`

---

### 1.6 Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Access**: Authenticated
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "id": 10,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "role": "ACCOUNT_HOLDER",
    "status": "ACTIVE",
    "locked": false,
    "accountCount": 1,
    "totalBalance": 1000.0000
  }
  ```

---

## 2. Customer Vault & Account APIs (`/api/v1/accounts`)

### 2.1 List Authenticated User Accounts
- **Endpoint**: `GET /api/v1/accounts`
- **Access**: Authenticated (`ACCOUNT_HOLDER`)
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 14,
      "accountNumber": "AC3905931389",
      "currency": "INR",
      "balance": 1000.0000,
      "status": "ACTIVE",
      "createdAt": "2026-11-13T10:15:00Z",
      "updatedAt": "2026-11-13T10:15:00Z"
    }
  ]
  ```

---

### 2.2 Get Specific Account Details
- **Endpoint**: `GET /api/v1/accounts/{id}`
- **Access**: Authenticated (Owner, `ADMIN`, or `AUDITOR`)
- **Response**: `200 OK` (Account details DTO)
- **Error Responses**:
  - `403 Forbidden`: If an account holder attempts to access an account owned by another tenant.
  - `404 Not Found`: If account does not exist.

---

### 2.3 Recipient Account Lookup
- **Endpoint**: `GET /api/v1/accounts/lookup?accountNumber=AC2200171052`
- **Access**: Authenticated
- **Response**: `200 OK`
  ```json
  {
    "accountNumber": "AC2200171052",
    "ownerName": "Sanand Jai",
    "currency": "INR",
    "status": "ACTIVE"
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Account number not recognized.

---

### 2.4 Account Ledger Statements
- **Endpoint**: `GET /api/v1/accounts/{id}/ledger`
- **Access**: Authenticated (Owner, `ADMIN`, or `AUDITOR`)
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 42,
      "entryType": "CREDIT",
      "amount": 100.0000,
      "balanceAfter": 1100.0000,
      "description": "Deposit via CASHIER",
      "referenceId": "DEP-7800a250-96ec-4d02-921e-ca6cc08433f4",
      "createdAt": "2026-11-13T12:00:00Z"
    }
  ]
  ```

---

## 3. Financial Transaction APIs (`/api/v1/transfers`)

### 3.1 Inter-Account Transfer
- **Endpoint**: `POST /api/v1/transfers`
- **Access**: Authenticated (`ACCOUNT_HOLDER`)
- **Request Body**:
  ```json
  {
    "sourceAccountNumber": "AC3905931389",
    "destinationAccountNumber": "AC2200171052",
    "amount": 150.00,
    "currency": "INR",
    "description": "Invoice Settlement #1042",
    "idempotencyKey": "8f4e2c81-8051-4e76-bfcf-692db2c16a30"
  }
  ```
- **Validation**:
  - `amount`: Strictly positive (`> 0.00`).
  - `sourceAccountNumber` $\neq$ `destinationAccountNumber`.
  - Source and destination currencies must match.
  - Source account balance $\ge$ amount.
  - Both accounts must be `ACTIVE`.
- **Response**: `201 Created`
  ```json
  {
    "id": 5,
    "referenceId": "TRF-defd121e-f14e-476e-b8b7-4ccb9b2fa592",
    "sourceAccountNumber": "AC3905931389",
    "destinationAccountNumber": "AC2200171052",
    "amount": 150.0000,
    "currency": "INR",
    "status": "COMPLETED",
    "createdAt": "2026-11-13T14:30:00Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `"Cannot transfer funds to the same account."`
  - `422 Unprocessable Entity`: `"Insufficient funds for transfer."` or `"Currency mismatch. Transfers are only supported between accounts with the same currency."`
  - `409 Conflict`: `"Idempotency key collision with different request payload."`

---

### 3.2 Vault Cash Deposit
- **Endpoint**: `POST /api/v1/transfers/deposit`
- **Access**: Authenticated (`ACCOUNT_HOLDER`)
- **Request Body**:
  ```json
  {
    "accountNumber": "AC3905931389",
    "amount": 500.00,
    "currency": "INR"
  }
  ```
- **Behavior**: Atomically debits `SYSTEM-CASH-INR` and credits the customer vault.
- **Response**: `200 OK` (Updated balance and deposit reference).

---

### 3.3 Vault Cash Withdrawal
- **Endpoint**: `POST /api/v1/transfers/withdraw`
- **Access**: Authenticated (`ACCOUNT_HOLDER`)
- **Request Body**:
  ```json
  {
    "accountNumber": "AC3905931389",
    "amount": 200.00,
    "currency": "INR"
  }
  ```
- **Behavior**: Atomically debits the customer vault and credits `SYSTEM-CASH-INR`.
- **Response**: `200 OK` (Updated balance and withdrawal reference).

---

## 4. Admin Command Center APIs (`/api/v1/admin`)

*All `/api/v1/admin/*` endpoints strictly require role `ADMIN`.*

### 4.1 System Overview & Telemetry
- **Endpoint**: `GET /api/v1/admin/overview`
- **Access**: `ADMIN`
- **Response**: `200 OK`
  ```json
  {
    "totalCustomers": 7,
    "activeUsers": 7,
    "suspendedUsers": 0,
    "lockedUsers": 0,
    "totalAccounts": 11,
    "activeAccounts": 11,
    "frozenAccounts": 0,
    "totalDepositsCount": 3,
    "totalDepositsVolume": 8556.0000,
    "totalWithdrawalsCount": 3,
    "totalWithdrawalsVolume": 1650.0000,
    "totalTransfersCount": 2,
    "totalTransfersVolume": 20.0000,
    "totalVolume": 10226.0000,
    "systemHealth": "HEALTHY",
    "activeVaultEngine": "PostgreSQL 18 / Spring Boot 3.3.5",
    "activityOverTime": [ /* 14 rolling daily points */ ],
    "typeDistribution": [
      { "type": "DEPOSIT", "count": 3, "volume": 8556.0000 },
      { "type": "WITHDRAWAL", "count": 3, "volume": 1650.0000 },
      { "type": "TRANSFER", "count": 2, "volume": 20.0000 }
    ],
    "customerGrowth": [ /* 14 rolling daily points */ ]
  }
  ```

---

### 4.2 User Directory & Access Control
- **Endpoint**: `GET /api/v1/admin/users`
- **Query Parameters**: `search`, `role`, `status`
- **Response**: `200 OK` (Array of user profiles with account counts and total balances).

### 4.3 Impose Administrative User Lock
- **Endpoint**: `POST /api/v1/admin/users/{id}/lock`
- **Response**: `200 OK`
  - Sets `is_locked = true` and `status = 'SUSPENDED'`.
  - Disallows locking administrative accounts (`403 Forbidden`).

### 4.4 Remove User Lock
- **Endpoint**: `POST /api/v1/admin/users/{id}/unlock`
- **Response**: `200 OK`
  - Sets `is_locked = false`, `status = 'ACTIVE'`, and resets `failed_login_attempts = 0`.

---

### 4.5 Account Registry & Freeze Control
- **Endpoint**: `GET /api/v1/admin/accounts`
- **Query Parameters**: `search`, `currency`, `status`
- **Response**: `200 OK` (List of accounts with balances and owner usernames).

### 4.6 Freeze Account
- **Endpoint**: `POST /api/v1/admin/accounts/{id}/freeze`
- **Response**: `200 OK`
  - Sets `status = 'FROZEN'`.
  - Blocks freezing core system operational accounts (`SYSTEM-CASH-INR` / `SYSTEM-CASH`) with `403 Forbidden`.

### 4.7 Unfreeze Account
- **Endpoint**: `POST /api/v1/admin/accounts/{id}/unfreeze`
- **Response**: `200 OK` (Sets `status = 'ACTIVE'`).

---

### 4.8 Unified Transaction Monitoring & Anomaly Detection
- **Endpoint**: `GET /api/v1/admin/transactions`
- **Query Parameters**: `search`, `type`, `status`, `suspiciousOnly`
- **Response**: `200 OK`
  - Returns unified double-entry transactions pairing source and destination accounts and user handles.
  - Automatically flags suspicious transactions (`isSuspicious: true`) if amount exceeds ₹50,000 (INR) or $10,000 (USD).

---

### 4.9 Cryptographic Balance Sheet Reconciliation
- **Endpoint**: `GET /api/v1/admin/reconciliation`
- **Access**: `ADMIN`
- **Response**: `200 OK`
  ```json
  {
    "status": "BALANCED",
    "totalDebits": 10326.0000,
    "totalCredits": 10326.0000,
    "variance": 0.0000,
    "totalAccounts": 11,
    "verifiedAccounts": 11,
    "discrepancyCount": 0,
    "discrepancies": [],
    "timestamp": "2026-11-13T15:20:00Z"
  }
  ```

---

## 5. Audit Trail APIs (`/api/v1/audit-logs`)

- **Endpoint**: `GET /api/v1/audit-logs`
- **Access**: `ADMIN` or `AUDITOR`
- **Query Parameters**: `search`, `action`, `entityType`, `startDate`, `endDate`
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 142,
      "username": "admin",
      "action": "ADMIN_FREEZE_ACCOUNT",
      "entityType": "ACCOUNT",
      "entityId": "AC3905931389",
      "details": "Administrative freeze placed on account AC3905931389",
      "ipAddress": "0:0:0:0:0:0:0:1",
      "createdAt": "2026-11-13T15:00:00Z"
    }
  ]
  ```

