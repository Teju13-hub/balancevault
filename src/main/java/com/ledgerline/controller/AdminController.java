package com.ledgerline.controller;

import com.ledgerline.dto.*;
import com.ledgerline.model.*;
import com.ledgerline.repository.*;
import com.ledgerline.service.AuditService;
import com.ledgerline.service.ReconciliationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuditService auditService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransferRepository transferRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final ReconciliationService reconciliationService;

    public AdminController(
            AuditService auditService,
            UserRepository userRepository,
            AccountRepository accountRepository,
            TransferRepository transferRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder,
            ReconciliationService reconciliationService) {
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transferRepository = transferRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.reconciliationService = reconciliationService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getAdminStatus(
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long userId = userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);

        auditService.logAdminAction(userId, "ADMIN_STATUS_CHECK", "ADMIN", "STATUS",
                "Administrator checked system status", clientIp);

        return ResponseEntity.ok(Map.of("status", "ACTIVE", "role", "ADMIN"));
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getAdminMetrics() {
        long totalCustomers = userRepository.countByRole(Role.ACCOUNT_HOLDER);
        long activeUsers = userRepository.countByStatus("ACTIVE");
        long suspendedUsers = userRepository.countByStatus("SUSPENDED");
        long totalAccounts = accountRepository.count();
        long totalTransfers = transferRepository.count();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalCustomers", totalCustomers);
        metrics.put("activeUsers", activeUsers);
        metrics.put("suspendedUsers", suspendedUsers);
        metrics.put("totalAccounts", totalAccounts);
        metrics.put("totalTransfers", totalTransfers);
        metrics.put("systemHealth", "HEALTHY");
        metrics.put("activeVaultEngine", "PostgreSQL 18 / Spring Boot 3.3.5");

        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminOverviewResponse> getAdminOverview() {
        AdminOverviewResponse overview = new AdminOverviewResponse();

        long totalCustomers = userRepository.countByRole(Role.ACCOUNT_HOLDER);
        long activeUsers = userRepository.countByStatus("ACTIVE");
        long suspendedUsers = userRepository.countByStatus("SUSPENDED");
        long lockedUsers = userRepository.countByIsLockedTrue();

        long totalAccounts = accountRepository.count();
        long activeAccounts = accountRepository.countByStatus("ACTIVE");
        long frozenAccounts = accountRepository.countByStatus("FROZEN");

        long totalDepositsCount = ledgerEntryRepository.countDeposits();
        BigDecimal totalDepositsVolume = ledgerEntryRepository.sumDeposits();

        long totalWithdrawalsCount = ledgerEntryRepository.countWithdrawals();
        BigDecimal totalWithdrawalsVolume = ledgerEntryRepository.sumWithdrawals();

        List<Transfer> allTransfers = transferRepository.findAllByOrderByCreatedAtDesc();
        long totalTransfersCount = allTransfers.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus())).count();
        BigDecimal totalTransfersVolume = allTransfers.stream()
                .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .map(Transfer::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalVolume = totalDepositsVolume.add(totalWithdrawalsVolume).add(totalTransfersVolume);

        overview.setTotalCustomers(totalCustomers);
        overview.setActiveUsers(activeUsers);
        overview.setSuspendedUsers(suspendedUsers);
        overview.setLockedUsers(lockedUsers);

        overview.setTotalAccounts(totalAccounts);
        overview.setActiveAccounts(activeAccounts);
        overview.setFrozenAccounts(frozenAccounts);

        overview.setTotalDepositsCount(totalDepositsCount);
        overview.setTotalDepositsVolume(totalDepositsVolume);
        overview.setTotalWithdrawalsCount(totalWithdrawalsCount);
        overview.setTotalWithdrawalsVolume(totalWithdrawalsVolume);
        overview.setTotalTransfersCount(totalTransfersCount);
        overview.setTotalTransfersVolume(totalTransfersVolume);
        overview.setTotalVolume(totalVolume);

        overview.setSystemHealth("HEALTHY");
        overview.setActiveVaultEngine("PostgreSQL 18 / Spring Boot 3.3.5");

        // Recent Transactions (Transfers + Ledger Deposits/Withdrawals)
        List<AdminTransactionResponse> allTxList = buildUnifiedTransactions();
        overview.setRecentTransactions(allTxList.stream().limit(8).toList());

        // Recent Registrations
        List<User> recentUsers = userRepository.findAllByOrderByCreatedAtDesc();
        List<UserProfileResponse> recentRegs = recentUsers.stream()
                .filter(u -> u.getRole() == Role.ACCOUNT_HOLDER)
                .limit(6)
                .map(this::toUserProfileResponse)
                .toList();
        overview.setRecentRegistrations(recentRegs);

        // Activity Over Time (last 14 days)
        overview.setActivityOverTime(buildActivityOverTime(allTxList));

        // Transaction Type Distribution
        List<Map<String, Object>> typeDist = new ArrayList<>();
        typeDist.add(Map.of("type", "DEPOSIT", "count", totalDepositsCount, "volume", totalDepositsVolume));
        typeDist.add(Map.of("type", "WITHDRAWAL", "count", totalWithdrawalsCount, "volume", totalWithdrawalsVolume));
        typeDist.add(Map.of("type", "TRANSFER", "count", totalTransfersCount, "volume", totalTransfersVolume));
        overview.setTypeDistribution(typeDist);

        // Customer Growth (last 14 days)
        overview.setCustomerGrowth(buildCustomerGrowth(recentUsers));

        return ResponseEntity.ok(overview);
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserProfileResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        auditService.logAdminAction(adminId, "ADMIN_LIST_USERS", "USER", "ALL", "Admin listed user directory", clientIp);

        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        List<Account> allAccounts = accountRepository.findAll();
        Map<Long, List<Account>> accountsByUser = allAccounts.stream()
                .filter(a -> a.getUser() != null)
                .collect(Collectors.groupingBy(a -> a.getUser().getId()));

        String s = search != null ? search.trim().toLowerCase() : "";

        List<UserProfileResponse> result = users.stream()
                .filter(u -> {
                    if (!s.isEmpty()) {
                        boolean matchName = (u.getFullName() != null && u.getFullName().toLowerCase().contains(s));
                        boolean matchUser = u.getUsername().toLowerCase().contains(s);
                        boolean matchEmail = u.getEmail().toLowerCase().contains(s);
                        boolean matchAcc = accountsByUser.getOrDefault(u.getId(), List.of()).stream()
                                .anyMatch(acc -> acc.getAccountNumber().toLowerCase().contains(s));
                        if (!matchName && !matchUser && !matchEmail && !matchAcc) return false;
                    }
                    if (role != null && !role.equalsIgnoreCase("ALL") && !u.getRole().name().equalsIgnoreCase(role)) {
                        return false;
                    }
                    if (status != null && !status.equalsIgnoreCase("ALL")) {
                        if ("LOCKED".equalsIgnoreCase(status)) {
                            if (!u.isLocked()) return false;
                        } else if (!u.getStatus().equalsIgnoreCase(status)) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(u -> {
                    UserProfileResponse res = toUserProfileResponse(u);
                    List<Account> userAccs = accountsByUser.getOrDefault(u.getId(), List.of());
                    res.setAccountCount(userAccs.size());
                    BigDecimal totalBal = userAccs.stream().map(Account::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
                    res.setTotalBalance(totalBal);
                    res.setAccounts(userAccs.stream().map(a -> new AccountResponse(
                            a.getId(), a.getAccountNumber(), a.getCurrency(), a.getBalance(), a.getCreatedAt(), a.getUpdatedAt()
                    )).toList());
                    return res;
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/users/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<UserProfileResponse> getUserDetails(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<Account> accounts = accountRepository.findAllByUser_Id(user.getId());

        auditService.logAdminAction(adminId, "ADMIN_VIEW_USER_DETAILS", "USER", String.valueOf(user.getId()),
                "Admin inspected complete profile for user: " + user.getUsername(), clientIp);

        UserProfileResponse res = toUserProfileResponse(user);
        res.setAccountCount(accounts.size());
        BigDecimal totalBal = accounts.stream().map(Account::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        res.setTotalBalance(totalBal);
        res.setAccounts(accounts.stream().map(a -> new AccountResponse(
                a.getId(), a.getAccountNumber(), a.getCurrency(), a.getBalance(), a.getCreatedAt(), a.getUpdatedAt()
        )).toList());

        return ResponseEntity.ok(res);
    }

    @PostMapping("/users/{id}/lock")
    @Transactional
    public ResponseEntity<UserProfileResponse> lockUser(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot lock administrative accounts");
        }

        user.setLocked(true);
        user.setStatus("SUSPENDED");
        User updated = userRepository.save(user);

        auditService.logAdminAction(adminId, "ADMIN_LOCK_USER", "USER", String.valueOf(updated.getId()),
                "Administrative security lock imposed on user: " + updated.getUsername(), clientIp);

        return ResponseEntity.ok(toUserProfileResponse(updated));
    }

    @PostMapping("/users/{id}/unlock")
    @Transactional
    public ResponseEntity<UserProfileResponse> unlockUser(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setLocked(false);
        user.setStatus("ACTIVE");
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        User updated = userRepository.save(user);

        auditService.logAdminAction(adminId, "ADMIN_UNLOCK_USER", "USER", String.valueOf(updated.getId()),
                "Administrative security unlock granted for user: " + updated.getUsername(), clientIp);

        return ResponseEntity.ok(toUserProfileResponse(updated));
    }

    @PatchMapping("/users/{id}/status")
    @Transactional
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot alter administrative account status");
        }

        String newStatus = body.get("status");
        if (newStatus == null || (!newStatus.equals("ACTIVE") && !newStatus.equals("SUSPENDED"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be either ACTIVE or SUSPENDED");
        }

        user.setStatus(newStatus);
        if ("SUSPENDED".equals(newStatus)) {
            user.setLocked(true);
        } else {
            user.setLocked(false);
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        }
        User updated = userRepository.save(user);

        auditService.logAdminAction(adminId, "ADMIN_UPDATE_USER_STATUS", "USER", String.valueOf(updated.getId()),
                "Admin changed user status to " + newStatus, clientIp);

        return ResponseEntity.ok(toUserProfileResponse(updated));
    }

    @PostMapping("/users")
    @Transactional
    public ResponseEntity<UserProfileResponse> createPrivilegedUser(
            @RequestBody Map<String, String> request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getRemoteAddr() != null ? servletRequest.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        String username = request.get("username");
        String email = request.get("email");
        String password = request.get("password");
        String fullName = request.get("fullName");
        String roleStr = request.get("role");

        if (username == null || email == null || password == null || roleStr == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username, email, password, and role are required");
        }

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        Role role;
        try {
            role = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleStr);
        }

        User newUser = new User(username, email, passwordEncoder.encode(password), role, fullName != null ? fullName : username);
        User saved = userRepository.save(newUser);

        auditService.logAdminAction(adminId, "ADMIN_CREATE_USER", "USER", String.valueOf(saved.getId()),
                "Admin created user with role " + role.name(), clientIp);

        return ResponseEntity.status(HttpStatus.CREATED).body(toUserProfileResponse(saved));
    }

    // =========================================================================
    // SECTION 3: ACCOUNT MANAGEMENT APIS
    // =========================================================================

    @GetMapping("/accounts")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AdminAccountResponse>> listAccounts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String status) {
        List<Account> accounts = accountRepository.findAllByOrderByCreatedAtDesc();

        String s = search != null ? search.trim().toLowerCase() : "";

        List<AdminAccountResponse> result = accounts.stream()
                .filter(a -> {
                    if (!s.isEmpty()) {
                        boolean matchAcc = a.getAccountNumber().toLowerCase().contains(s);
                        boolean matchUser = a.getUser() != null && (
                                a.getUser().getUsername().toLowerCase().contains(s) ||
                                a.getUser().getEmail().toLowerCase().contains(s) ||
                                (a.getUser().getFullName() != null && a.getUser().getFullName().toLowerCase().contains(s))
                        );
                        if (!matchAcc && !matchUser) return false;
                    }
                    if (currency != null && !currency.equalsIgnoreCase("ALL") && !a.getCurrency().equalsIgnoreCase(currency)) {
                        return false;
                    }
                    if (status != null && !status.equalsIgnoreCase("ALL") && !a.getStatus().equalsIgnoreCase(status)) {
                        return false;
                    }
                    return true;
                })
                .map(this::toAdminAccountResponse)
                .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/accounts/{id}/freeze")
    @Transactional
    public ResponseEntity<AdminAccountResponse> freezeAccount(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        if (account.getUser() == null || account.getAccountNumber().startsWith("SYSTEM-")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot freeze core system operational vault");
        }

        account.setStatus("FROZEN");
        Account updated = accountRepository.save(account);

        auditService.logAdminAction(adminId, "ADMIN_FREEZE_ACCOUNT", "ACCOUNT", updated.getAccountNumber(),
                "Administrative freeze placed on account " + updated.getAccountNumber(), clientIp);

        return ResponseEntity.ok(toAdminAccountResponse(updated));
    }

    @PostMapping("/accounts/{id}/unfreeze")
    @Transactional
    public ResponseEntity<AdminAccountResponse> unfreezeAccount(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        Long adminId = userRepository.findByUsername(authentication.getName()).map(User::getId).orElse(null);

        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        account.setStatus("ACTIVE");
        Account updated = accountRepository.save(account);

        auditService.logAdminAction(adminId, "ADMIN_UNFREEZE_ACCOUNT", "ACCOUNT", updated.getAccountNumber(),
                "Administrative unfreeze granted for account " + updated.getAccountNumber(), clientIp);

        return ResponseEntity.ok(toAdminAccountResponse(updated));
    }

    // =========================================================================
    // SECTION 4: TRANSACTION MONITORING APIS
    // =========================================================================

    @GetMapping("/transactions")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AdminTransactionResponse>> listTransactions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean suspiciousOnly) {
        List<AdminTransactionResponse> allTx = buildUnifiedTransactions();

        String s = search != null ? search.trim().toLowerCase() : "";

        List<AdminTransactionResponse> filtered = allTx.stream()
                .filter(tx -> {
                    if (!s.isEmpty()) {
                        boolean matchRef = tx.getReferenceId().toLowerCase().contains(s);
                        boolean matchDesc = tx.getDescription() != null && tx.getDescription().toLowerCase().contains(s);
                        boolean matchSrc = tx.getSourceAccount().toLowerCase().contains(s) || (tx.getSourceUser() != null && tx.getSourceUser().toLowerCase().contains(s));
                        boolean matchDst = tx.getDestinationAccount().toLowerCase().contains(s) || (tx.getDestinationUser() != null && tx.getDestinationUser().toLowerCase().contains(s));
                        if (!matchRef && !matchDesc && !matchSrc && !matchDst) return false;
                    }
                    if (type != null && !type.equalsIgnoreCase("ALL") && !tx.getType().equalsIgnoreCase(type)) {
                        return false;
                    }
                    if (status != null && !status.equalsIgnoreCase("ALL") && !tx.getStatus().equalsIgnoreCase(status)) {
                        return false;
                    }
                    if (suspiciousOnly != null && suspiciousOnly && !tx.isSuspicious()) {
                        return false;
                    }
                    return true;
                })
                .toList();

        return ResponseEntity.ok(filtered);
    }

    // =========================================================================
    // SECTION 6: SECURITY CENTER APIS
    // =========================================================================

    @GetMapping("/security/telemetry")
    @Transactional(readOnly = true)
    public ResponseEntity<SecurityTelemetryResponse> getSecurityTelemetry() {
        SecurityTelemetryResponse telemetry = new SecurityTelemetryResponse();

        List<User> usersWithFailed = userRepository.findAllByFailedLoginAttemptsGreaterThanOrderByFailedLoginAttemptsDesc(0);
        List<User> lockedUsers = userRepository.findAllByIsLockedTrue();

        List<Map<String, Object>> failedList = usersWithFailed.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("email", u.getEmail());
            m.put("failedLoginAttempts", u.getFailedLoginAttempts());
            m.put("isLocked", u.isLocked());
            m.put("lockedUntil", u.getLockedUntil());
            return m;
        }).toList();

        List<Map<String, Object>> lockedList = lockedUsers.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("email", u.getEmail());
            m.put("status", u.getStatus());
            m.put("failedLoginAttempts", u.getFailedLoginAttempts());
            m.put("lockedUntil", u.getLockedUntil());
            return m;
        }).toList();

        List<String> authActions = List.of(
                "LOGIN_SUCCESS", "LOGIN_FAILED", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_SUCCESS",
                "PASSWORD_CHANGE_SUCCESS", "PASSWORD_CHANGE_FAILED", "ACCOUNT_LOCKED", "ADMIN_LOCK_USER",
                "ADMIN_UNLOCK_USER", "ADMIN_STATUS_CHECK"
        );
        List<AuditLog> authLogs = auditLogRepository.findAllByActionInOrderByCreatedAtDesc(authActions);
        List<AuditLogResponse> authResponses = authLogs.stream()
                .limit(30)
                .map(l -> new AuditLogResponse(
                        l.getId(),
                        l.getUser() != null ? l.getUser().getUsername() : null,
                        l.getAction(),
                        l.getEntityType(),
                        l.getEntityId(),
                        l.getDetails(),
                        l.getIpAddress(),
                        l.getCreatedAt()
                ))
                .toList();

        List<AdminTransactionResponse> allTx = buildUnifiedTransactions();
        List<AdminTransactionResponse> suspicious = allTx.stream().filter(AdminTransactionResponse::isSuspicious).toList();

        long totalFailed = usersWithFailed.stream().mapToLong(User::getFailedLoginAttempts).sum();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalFailedLoginAttempts", totalFailed);
        summary.put("lockedAccountsCount", lockedUsers.size());
        summary.put("suspiciousTransactionsCount", suspicious.size());
        summary.put("threatLevel", lockedUsers.size() > 2 || suspicious.size() > 3 ? "ELEVATED" : "GUARDED");
        summary.put("bruteForceProtection", "Active (5-attempt 15-minute lock)");
        summary.put("idempotencyGuard", "Active (24-hour cryptographic replay defense)");
        summary.put("ledgerImmutability", "Enforced (DB triggers block modification)");

        telemetry.setTotalFailedAttempts(totalFailed);
        telemetry.setLockedAccountsCount(lockedUsers.size());
        telemetry.setBruteForceDefenseStatus("ACTIVE");
        telemetry.setFailedLoginUsers(failedList);
        telemetry.setLockedUsers(lockedList);
        telemetry.setRecentAuthEvents(authResponses);
        telemetry.setSuspiciousTransactions(suspicious);
        telemetry.setSecuritySummary(summary);

        return ResponseEntity.ok(telemetry);
    }

    // =========================================================================
    // SECTION 7: REPORTS & ANALYTICS APIS
    // =========================================================================

    @GetMapping("/reports")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminReportResponse> getReports(
            @RequestParam(defaultValue = "DAILY") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        AdminReportResponse report = new AdminReportResponse();
        report.setPeriod(period);

        Instant start = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant end = Instant.now();

        DateTimeFormatter dtf = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);
        if (startDate != null && !startDate.isBlank()) {
            try {
                start = LocalDate.parse(startDate).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (Exception ignored) {}
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                end = LocalDate.parse(endDate).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (Exception ignored) {}
        }

        report.setStartDate(dtf.format(start));
        report.setEndDate(dtf.format(end));

        List<AdminTransactionResponse> allTx = buildUnifiedTransactions();
        final Instant fStart = start;
        final Instant fEnd = end;

        List<AdminTransactionResponse> inRangeTx = allTx.stream()
                .filter(tx -> tx.getCreatedAt().isAfter(fStart) && tx.getCreatedAt().isBefore(fEnd))
                .toList();

        long depCount = inRangeTx.stream().filter(tx -> "DEPOSIT".equalsIgnoreCase(tx.getType())).count();
        BigDecimal depVol = inRangeTx.stream().filter(tx -> "DEPOSIT".equalsIgnoreCase(tx.getType()))
                .map(AdminTransactionResponse::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        long wthCount = inRangeTx.stream().filter(tx -> "WITHDRAWAL".equalsIgnoreCase(tx.getType())).count();
        BigDecimal wthVol = inRangeTx.stream().filter(tx -> "WITHDRAWAL".equalsIgnoreCase(tx.getType()))
                .map(AdminTransactionResponse::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        long trfCount = inRangeTx.stream().filter(tx -> "TRANSFER".equalsIgnoreCase(tx.getType())).count();
        BigDecimal trfVol = inRangeTx.stream().filter(tx -> "TRANSFER".equalsIgnoreCase(tx.getType()))
                .map(AdminTransactionResponse::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        report.setTotalDepositsCount(depCount);
        report.setTotalDepositsVolume(depVol);
        report.setTotalWithdrawalsCount(wthCount);
        report.setTotalWithdrawalsVolume(wthVol);
        report.setTotalTransfersCount(trfCount);
        report.setTotalTransfersVolume(trfVol);
        report.setNetVolume(depVol.subtract(wthVol));

        List<User> allUsers = userRepository.findAll();
        long newUsers = allUsers.stream()
                .filter(u -> u.getRole() == Role.ACCOUNT_HOLDER && u.getCreatedAt().isAfter(fStart) && u.getCreatedAt().isBefore(fEnd))
                .count();
        report.setNewRegistrations(newUsers);

        // Currency Breakdown
        Map<String, BigDecimal> cMap = new HashMap<>();
        for (AdminTransactionResponse tx : inRangeTx) {
            cMap.merge(tx.getCurrency(), tx.getAmount(), BigDecimal::add);
        }
        report.setCurrencyBreakdown(cMap);

        // Daily Summaries
        Map<String, Map<String, Object>> dailyMap = new LinkedHashMap<>();
        LocalDate cur = LocalDate.ofInstant(start, ZoneOffset.UTC);
        LocalDate endLocal = LocalDate.ofInstant(end, ZoneOffset.UTC);

        while (!cur.isAfter(endLocal)) {
            String dateKey = cur.toString();
            Map<String, Object> day = new HashMap<>();
            day.put("date", dateKey);
            day.put("deposits", BigDecimal.ZERO);
            day.put("withdrawals", BigDecimal.ZERO);
            day.put("transfers", BigDecimal.ZERO);
            day.put("registrations", 0L);
            dailyMap.put(dateKey, day);
            cur = cur.plusDays(1);
        }

        for (AdminTransactionResponse tx : inRangeTx) {
            String d = LocalDate.ofInstant(tx.getCreatedAt(), ZoneOffset.UTC).toString();
            Map<String, Object> day = dailyMap.get(d);
            if (day != null) {
                if ("DEPOSIT".equalsIgnoreCase(tx.getType())) {
                    BigDecimal curV = (BigDecimal) day.get("deposits");
                    day.put("deposits", curV.add(tx.getAmount()));
                } else if ("WITHDRAWAL".equalsIgnoreCase(tx.getType())) {
                    BigDecimal curV = (BigDecimal) day.get("withdrawals");
                    day.put("withdrawals", curV.add(tx.getAmount()));
                } else if ("TRANSFER".equalsIgnoreCase(tx.getType())) {
                    BigDecimal curV = (BigDecimal) day.get("transfers");
                    day.put("transfers", curV.add(tx.getAmount()));
                }
            }
        }

        for (User u : allUsers) {
            if (u.getCreatedAt().isAfter(fStart) && u.getCreatedAt().isBefore(fEnd)) {
                String d = LocalDate.ofInstant(u.getCreatedAt(), ZoneOffset.UTC).toString();
                Map<String, Object> day = dailyMap.get(d);
                if (day != null) {
                    long cnt = (long) day.get("registrations");
                    day.put("registrations", cnt + 1);
                }
            }
        }

        report.setDailySummaries(new ArrayList<>(dailyMap.values()));

        return ResponseEntity.ok(report);
    }

    @GetMapping("/reconciliation")
    public ResponseEntity<ReconciliationService.ReconciliationReport> getReconciliation() {
        return ResponseEntity.ok(reconciliationService.performReconciliation());
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private UserProfileResponse toUserProfileResponse(User user) {
        UserProfileResponse res = new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getStatus() != null ? user.getStatus() : "ACTIVE",
                user.getCreatedAt()
        );
        res.setIsLocked(user.isLocked());
        res.setFailedLoginAttempts(user.getFailedLoginAttempts());
        res.setLockedUntil(user.getLockedUntil());
        return res;
    }

    private AdminAccountResponse toAdminAccountResponse(Account account) {
        boolean isSys = account.getUser() == null || account.getAccountNumber().startsWith("SYSTEM-");
        return new AdminAccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getUser() != null ? account.getUser().getId() : null,
                account.getUser() != null ? account.getUser().getUsername() : "SYSTEM",
                account.getUser() != null ? account.getUser().getFullName() : "Operational System Vault",
                account.getUser() != null ? account.getUser().getEmail() : "system@balancevault.local",
                account.getCurrency(),
                account.getBalance(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt(),
                isSys
        );
    }

    private List<AdminTransactionResponse> buildUnifiedTransactions() {
        List<AdminTransactionResponse> list = new ArrayList<>();

        // 1. Transfers
        List<Transfer> transfers = transferRepository.findAllByOrderByCreatedAtDesc();
        for (Transfer t : transfers) {
            String sAcc = t.getSourceAccount() != null ? t.getSourceAccount().getAccountNumber() : "UNKNOWN";
            String sUser = (t.getSourceAccount() != null && t.getSourceAccount().getUser() != null)
                    ? t.getSourceAccount().getUser().getUsername() : "SYSTEM";
            String dAcc = t.getDestinationAccount() != null ? t.getDestinationAccount().getAccountNumber() : "UNKNOWN";
            String dUser = (t.getDestinationAccount() != null && t.getDestinationAccount().getUser() != null)
                    ? t.getDestinationAccount().getUser().getUsername() : "SYSTEM";

            boolean isSuspicious = false;
            String reason = null;
            if (t.getAmount().compareTo(new BigDecimal("50000")) >= 0) {
                isSuspicious = true;
                reason = "High-value movement (Exceeds ₹50,000 threshold)";
            } else if ("FAILED".equalsIgnoreCase(t.getStatus())) {
                isSuspicious = true;
                reason = "Transfer failed execution";
            }

            list.add(new AdminTransactionResponse(
                    "TRF-" + t.getId(),
                    t.getReferenceId(),
                    "TRANSFER",
                    sAcc,
                    sUser,
                    dAcc,
                    dUser,
                    t.getAmount(),
                    t.getCurrency(),
                    t.getStatus(),
                    t.getDescription(),
                    t.getCreatedAt(),
                    isSuspicious,
                    reason
            ));
        }

        // 2. Ledger Entries (Deposits and Withdrawals)
        List<LedgerEntry> entries = ledgerEntryRepository.findAllByOrderByCreatedAtDesc();
        Map<String, List<LedgerEntry>> groupedByRef = new LinkedHashMap<>();
        for (LedgerEntry e : entries) {
            String ref = e.getReferenceId();
            if (ref == null || ref.startsWith("TRF-")) continue;
            groupedByRef.computeIfAbsent(ref, k -> new ArrayList<>()).add(e);
        }

        for (Map.Entry<String, List<LedgerEntry>> entryGroup : groupedByRef.entrySet()) {
            String ref = entryGroup.getKey();
            List<LedgerEntry> group = entryGroup.getValue();

            // Find customer entry (account not starting with SYSTEM-)
            LedgerEntry customerEntry = group.stream()
                    .filter(e -> e.getAccount() != null && !e.getAccount().getAccountNumber().startsWith("SYSTEM-"))
                    .findFirst()
                    .orElse(group.get(0));

            LedgerEntry systemEntry = group.stream()
                    .filter(e -> e.getAccount() != null && e.getAccount().getAccountNumber().startsWith("SYSTEM-"))
                    .findFirst()
                    .orElse(null);

            String custAcc = customerEntry.getAccount().getAccountNumber();
            String custUser = (customerEntry.getAccount().getUser() != null)
                    ? customerEntry.getAccount().getUser().getUsername()
                    : "CUSTOMER";

            String sysAcc = systemEntry != null ? systemEntry.getAccount().getAccountNumber()
                    : (customerEntry.getAccount().getCurrency().equalsIgnoreCase("INR") ? "SYSTEM-CASH-INR" : "SYSTEM-CASH");
            String sysUser = "CASHIER";

            String type;
            String srcAcc;
            String srcUser;
            String dstAcc;
            String dstUser;

            if (ref.startsWith("WTH-") || (customerEntry.getDescription() != null && customerEntry.getDescription().toLowerCase().contains("withdrawal")) || "DEBIT".equalsIgnoreCase(customerEntry.getEntryType())) {
                type = "WITHDRAWAL";
                srcAcc = custAcc;
                srcUser = custUser;
                dstAcc = sysAcc;
                dstUser = sysUser;
            } else {
                type = "DEPOSIT";
                srcAcc = sysAcc;
                srcUser = sysUser;
                dstAcc = custAcc;
                dstUser = custUser;
            }

            boolean isSuspicious = false;
            String reason = null;
            if (customerEntry.getAmount().compareTo(new BigDecimal("50000")) >= 0) {
                isSuspicious = true;
                reason = "High-value movement (Exceeds ₹50,000 threshold)";
            }

            list.add(new AdminTransactionResponse(
                    "LED-" + customerEntry.getId(),
                    ref,
                    type,
                    srcAcc,
                    srcUser,
                    dstAcc,
                    dstUser,
                    customerEntry.getAmount(),
                    customerEntry.getAccount().getCurrency(),
                    "COMPLETED",
                    customerEntry.getDescription(),
                    customerEntry.getCreatedAt(),
                    isSuspicious,
                    reason
            ));
        }

        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return list;
    }

    private List<Map<String, Object>> buildActivityOverTime(List<AdminTransactionResponse> allTx) {
        Map<String, Map<String, Object>> dayMap = new LinkedHashMap<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = 13; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            String k = d.toString();
            Map<String, Object> m = new HashMap<>();
            m.put("date", k);
            m.put("deposits", 0L);
            m.put("withdrawals", 0L);
            m.put("transfers", 0L);
            m.put("totalVolume", BigDecimal.ZERO);
            dayMap.put(k, m);
        }

        for (AdminTransactionResponse tx : allTx) {
            String d = LocalDate.ofInstant(tx.getCreatedAt(), ZoneOffset.UTC).toString();
            Map<String, Object> m = dayMap.get(d);
            if (m != null) {
                BigDecimal curVol = (BigDecimal) m.get("totalVolume");
                m.put("totalVolume", curVol.add(tx.getAmount()));
                if ("DEPOSIT".equalsIgnoreCase(tx.getType())) {
                    m.put("deposits", (long) m.get("deposits") + 1);
                } else if ("WITHDRAWAL".equalsIgnoreCase(tx.getType())) {
                    m.put("withdrawals", (long) m.get("withdrawals") + 1);
                } else if ("TRANSFER".equalsIgnoreCase(tx.getType())) {
                    m.put("transfers", (long) m.get("transfers") + 1);
                }
            }
        }

        return new ArrayList<>(dayMap.values());
    }

    private List<Map<String, Object>> buildCustomerGrowth(List<User> users) {
        Map<String, Long> growthMap = new LinkedHashMap<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = 13; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            growthMap.put(d.toString(), 0L);
        }

        for (User u : users) {
            if (u.getRole() == Role.ACCOUNT_HOLDER) {
                String d = LocalDate.ofInstant(u.getCreatedAt(), ZoneOffset.UTC).toString();
                if (growthMap.containsKey(d)) {
                    growthMap.put(d, growthMap.get(d) + 1);
                }
            }
        }

        List<Map<String, Object>> list = new ArrayList<>();
        long runningTotal = userRepository.countByRole(Role.ACCOUNT_HOLDER) - growthMap.values().stream().mapToLong(Long::longValue).sum();
        for (Map.Entry<String, Long> entry : growthMap.entrySet()) {
            runningTotal += entry.getValue();
            Map<String, Object> m = new HashMap<>();
            m.put("date", entry.getKey());
            m.put("newCustomers", entry.getValue());
            m.put("totalCustomers", runningTotal);
            list.add(m);
        }
        return list;
    }
}
