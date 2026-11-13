package com.ledgerline.dto;

public class OtpInitiateResponse {
    private String status;
    private String message;
    private String email;
    private long expiresInSeconds;
    private long resendCooldownSeconds;

    public OtpInitiateResponse() {
    }

    public OtpInitiateResponse(String status, String message, String email, long expiresInSeconds, long resendCooldownSeconds) {
        this.status = status;
        this.message = message;
        this.email = email;
        this.expiresInSeconds = expiresInSeconds;
        this.resendCooldownSeconds = resendCooldownSeconds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public long getExpiresInSeconds() {
        return expiresInSeconds;
    }

    public void setExpiresInSeconds(long expiresInSeconds) {
        this.expiresInSeconds = expiresInSeconds;
    }

    public long getResendCooldownSeconds() {
        return resendCooldownSeconds;
    }

    public void setResendCooldownSeconds(long resendCooldownSeconds) {
        this.resendCooldownSeconds = resendCooldownSeconds;
    }
}

