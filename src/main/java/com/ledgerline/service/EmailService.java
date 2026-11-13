package com.ledgerline.service;

public interface EmailService {
    void sendRegistrationOtp(String toEmail, String fullName, String otp);
    void sendAccountCreationSuccessEmail(String toEmail, String fullName, String accountNumber, String createdAtFormatted);
    void sendPasswordResetEmail(String toEmail, String fullName, String resetToken, String resetUrl);
    boolean isConfigured();
}

