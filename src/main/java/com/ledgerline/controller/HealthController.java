package com.ledgerline.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping({"/api/health", "/api/v1/health"})
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("service", "BalanceVault-API");
        health.put("timestamp", Instant.now().toString());

        try {
            Integer dbResult = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            if (dbResult != null && dbResult == 1) {
                health.put("status", "UP");
                health.put("database", "CONNECTED");
                return ResponseEntity.ok(health);
            } else {
                health.put("status", "DOWN");
                health.put("database", "UNEXPECTED_RESPONSE");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
            }
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("database", "DISCONNECTED");
            health.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }
}
