package com.ledgerline.security.ratelimit;

/**
 * Thread-safe Token Bucket implementation for rate limiting.
 *
 * Single-instance in-memory limitation:
 * Token buckets are maintained in-memory on the application instance.
 * In a distributed, multi-node deployment, rate limiting state must be backed
 * by an external distributed store such as Redis or a shared key-value cache.
 */
public class TokenBucket {

    private final long capacity;
    private final double refillTokensPerSecond;
    private double availableTokens;
    private long lastRefillNanos;

    public TokenBucket(long capacity, double refillTokensPerSecond) {
        this.capacity = capacity;
        this.refillTokensPerSecond = refillTokensPerSecond;
        this.availableTokens = capacity;
        this.lastRefillNanos = System.nanoTime();
    }

    public synchronized boolean tryConsume() {
        refill();
        if (availableTokens >= 1.0) {
            availableTokens -= 1.0;
            return true;
        }
        return false;
    }

    public synchronized double getAvailableTokens() {
        refill();
        return availableTokens;
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsedSeconds = (now - lastRefillNanos) / 1_000_000_000.0;
        if (elapsedSeconds > 0) {
            double tokensToAdd = elapsedSeconds * refillTokensPerSecond;
            this.availableTokens = Math.min((double) capacity, this.availableTokens + tokensToAdd);
            this.lastRefillNanos = now;
        }
    }
}

