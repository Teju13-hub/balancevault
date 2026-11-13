package com.ledgerline.security;

import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;

@Component
@Order(10)
public class AdminProvisioningRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminProvisioningRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username:${ADMIN_USERNAME:admin}}")
    private String adminUsername;

    @Value("${admin.email:${ADMIN_EMAIL:admin@ledgerline.local}}")
    private String adminEmail;

    @Value("${admin.initial-password:${ADMIN_INITIAL_PASSWORD:}}")
    private String adminInitialPassword;

    public AdminProvisioningRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        loadDotEnvFallback();

        String username = adminUsername != null && !adminUsername.isBlank() ? adminUsername.trim() : "admin";
        String email = adminEmail != null && !adminEmail.isBlank() ? adminEmail.trim().toLowerCase() : "admin@ledgerline.local";

        User admin = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .orElse(null);

        if (admin == null) {
            String initialPass = (adminInitialPassword != null && !adminInitialPassword.isBlank())
                    ? adminInitialPassword.trim()
                    : "AdminPass123!";
            admin = new User(username, email, passwordEncoder.encode(initialPass), Role.ADMIN, "System Administrator");
            admin.setStatus("ACTIVE");
            admin.setLocked(false);
            admin.setFailedLoginAttempts(0);
            admin.setLockedUntil(null);
            userRepository.save(admin);
            log.info("[SECURITY] Initial administrator account '{}' ({}) provisioned successfully.", username, email);
        } else {
            boolean updated = false;
            if (admin.getRole() != Role.ADMIN) {
                admin.setRole(Role.ADMIN);
                updated = true;
            }
            if (admin.isLocked() || admin.getFailedLoginAttempts() > 0) {
                admin.setLocked(false);
                admin.setFailedLoginAttempts(0);
                admin.setLockedUntil(null);
                updated = true;
            }
            if (!"ACTIVE".equals(admin.getStatus())) {
                admin.setStatus("ACTIVE");
                updated = true;
            }
            if (email != null && !email.equalsIgnoreCase(admin.getEmail())) {
                admin.setEmail(email);
                updated = true;
            }
            if (adminInitialPassword != null && !adminInitialPassword.isBlank()) {
                String targetPass = adminInitialPassword.trim();
                if (!passwordEncoder.matches(targetPass, admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode(targetPass));
                    updated = true;
                    log.info("[SECURITY] Administrator password synchronized with environment configuration.");
                }
            }
            if (updated) {
                userRepository.save(admin);
            }
            log.info("[SECURITY] Administrative account '{}' ({}) verified and active.", admin.getUsername(), admin.getEmail());
        }
    }

    private void loadDotEnvFallback() {
        if (adminInitialPassword == null || adminInitialPassword.isBlank()) {
            File[] candidates = new File[] {
                    new File(".env"),
                    new File("../.env")
            };
            for (File envFile : candidates) {
                if (envFile.exists() && envFile.isFile()) {
                    try (BufferedReader reader = new BufferedReader(new FileReader(envFile, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            line = line.trim();
                            if (line.isEmpty() || line.startsWith("#")) continue;
                            int eq = line.indexOf('=');
                            if (eq > 0) {
                                String k = line.substring(0, eq).trim();
                                String v = line.substring(eq + 1).trim();
                                if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
                                    if (v.length() >= 2) {
                                        v = v.substring(1, v.length() - 1);
                                    }
                                }
                                if ("ADMIN_INITIAL_PASSWORD".equalsIgnoreCase(k) && (adminInitialPassword == null || adminInitialPassword.isBlank())) {
                                    adminInitialPassword = v;
                                }
                                if ("ADMIN_USERNAME".equalsIgnoreCase(k) && (adminUsername == null || adminUsername.isBlank())) {
                                    adminUsername = v;
                                }
                                if ("ADMIN_EMAIL".equalsIgnoreCase(k) && (adminEmail == null || adminEmail.isBlank())) {
                                    adminEmail = v;
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("[SECURITY] Could not parse fallback .env file: {}", e.getMessage());
                    }
                    if (adminInitialPassword != null && !adminInitialPassword.isBlank()) {
                        break;
                    }
                }
            }
        }
    }
}
