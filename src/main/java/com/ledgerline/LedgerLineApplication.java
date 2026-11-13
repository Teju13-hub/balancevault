package com.ledgerline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@SpringBootApplication
public class LedgerLineApplication {

    public static void main(String[] args) {
        loadDotEnvIfPresent();
        SpringApplication.run(LedgerLineApplication.class, args);
    }

    /**
     * Reads a local '.env' file from the current directory or user.dir if present,
     * setting key-value pairs as System properties if not already present in the OS environment.
     * This provides seamless local development support without requiring third-party libraries.
     */
    static void loadDotEnvIfPresent() {
        File[] candidates = new File[] {
            new File(".env"),
            new File(System.getProperty("user.dir", "."), ".env")
        };

        for (File envFile : candidates) {
            if (envFile.exists() && envFile.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(envFile, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eqIndex = line.indexOf('=');
                        if (eqIndex > 0) {
                            String key = line.substring(0, eqIndex).trim();
                            String value = line.substring(eqIndex + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                if (value.length() >= 2) {
                                    value = value.substring(1, value.length() - 1);
                                }
                            }
                            // Do not override system environment variables if already set in OS
                            if (System.getenv(key) == null && System.getProperty(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                } catch (IOException e) {
                    System.err.println("Notice: Could not read .env file: " + e.getMessage());
                }
                break;
            }
        }
    }
}
