package com.ledgerline.security.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing per-IP token buckets for authentication endpoints.
 *
 * Architectural Note: Single-instance in-memory rate limiting.
 * State is retained in memory for this application JVM.
 */
@Service
public class RateLimiterService {

    // Default policy: 5 requests capacity, refilled at 5 tokens per 60 seconds
    private static final long DEFAULT_CAPACITY = 5;
    private static final double DEFAULT_REFILL_PER_SECOND = 5.0 / 60.0;

    private final ConcurrentHashMap<String, TokenBucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TokenBucket> registerBuckets = new ConcurrentHashMap<>();

    public boolean tryConsumeLogin(String clientIp) {
        String key = (clientIp != null && !clientIp.isBlank()) ? clientIp : "unknown";
        return loginBuckets.computeIfAbsent(key, k -> new TokenBucket(DEFAULT_CAPACITY, DEFAULT_REFILL_PER_SECOND)).tryConsume();
    }

    public boolean tryConsumeRegister(String clientIp) {
        String key = (clientIp != null && !clientIp.isBlank()) ? clientIp : "unknown";
        return registerBuckets.computeIfAbsent(key, k -> new TokenBucket(DEFAULT_CAPACITY, DEFAULT_REFILL_PER_SECOND)).tryConsume();
    }

    /**
     * Resolves the real peer IP address without blindly trusting spoofable headers.
     * In the absence of an authorized, cryptographic reverse-proxy edge configuration,
     * getRemoteAddr() provides reliable, unforgeable TCP client identification.
     */
    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    /**
     * Resets rate limiter buckets (used for clean test fixture isolation).
     */
    public void reset() {
        loginBuckets.clear();
        registerBuckets.clear();
    }
}

