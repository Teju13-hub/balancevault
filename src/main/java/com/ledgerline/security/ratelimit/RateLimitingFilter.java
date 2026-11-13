package com.ledgerline.security.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Security filter enforcing rate limits on sensitive authentication endpoints.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    public RateLimitingFilter(RateLimiterService rateLimiterService, ObjectMapper objectMapper) {
        this.rateLimiterService = rateLimiterService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && uri != null) {
            String clientIp = rateLimiterService.extractClientIp(request);

            if (uri.endsWith("/api/v1/auth/login")) {
                if (!rateLimiterService.tryConsumeLogin(clientIp)) {
                    sendRateLimitExceededResponse(request, response);
                    return;
                }
            } else if (uri.contains("/api/v1/auth/register")) {
                if (!rateLimiterService.tryConsumeRegister(clientIp)) {
                    sendRateLimitExceededResponse(request, response);
                    return;
                }
            } else if (uri.contains("/api/v1/auth/forgot-password") || uri.contains("/api/v1/auth/reset-password")) {
                if (!rateLimiterService.tryConsumeForgotPassword(clientIp)) {
                    sendRateLimitExceededResponse(request, response);
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendRateLimitExceededResponse(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("message", "Rate limit exceeded. Please try again later.");
        body.put("path", request.getServletPath());

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
