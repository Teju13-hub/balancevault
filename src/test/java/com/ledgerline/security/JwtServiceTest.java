package com.ledgerline.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String VALID_256_BIT_SECRET = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

    @Test
    @DisplayName("JwtService constructor throws IllegalStateException when secret is null or blank")
    void shouldThrowWhenSecretIsBlank() {
        assertThrows(IllegalStateException.class, () -> new JwtService(null, 3600000));
        assertThrows(IllegalStateException.class, () -> new JwtService("", 3600000));
        assertThrows(IllegalStateException.class, () -> new JwtService("   ", 3600000));
    }

    @Test
    @DisplayName("JwtService constructor throws IllegalArgumentException when secret is less than 256 bits (32 bytes)")
    void shouldThrowWhenSecretIsLessThan32Bytes() {
        String shortSecret = "too-short-secret-key-16b";
        assertTrue(shortSecret.getBytes().length < 32);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new JwtService(shortSecret, 3600000));
        assertTrue(ex.getMessage().contains("at least 256 bits"));
    }

    @Test
    @DisplayName("JwtService successfully initializes and generates/validates tokens with valid 256-bit secret")
    void shouldInitializeWithValidSecret() {
        JwtService jwtService = new JwtService(VALID_256_BIT_SECRET, 3600000);

        String token = jwtService.generateToken("testuser", "ACCOUNT_HOLDER");
        assertNotNull(token);
        assertTrue(jwtService.isTokenValid(token, "testuser"));
        assertEquals("ACCOUNT_HOLDER", jwtService.extractRole(token));
        assertEquals("testuser", jwtService.extractUsername(token));
    }
}
