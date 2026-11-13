package com.ledgerline.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Properties;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final String host;
    private final int port;
    private final String username;
    private final String password;
    private final String fromAddress;
    private final boolean auth;
    private final boolean starttls;
    private final boolean devMode;

    public EmailServiceImpl(
            @Value("${SMTP_HOST:${spring.mail.host:}}") String host,
            @Value("${SMTP_PORT:${spring.mail.port:587}}") int port,
            @Value("${SMTP_USERNAME:${spring.mail.username:}}") String username,
            @Value("${SMTP_PASSWORD:${spring.mail.password:}}") String password,
            @Value("${SMTP_FROM:no-reply@balancevault.com}") String fromAddress,
            @Value("${SMTP_AUTH:true}") boolean auth,
            @Value("${SMTP_STARTTLS:true}") boolean starttls,
            @Value("${MAIL_DEV_MODE:false}") boolean devMode) {
        this.host = host != null ? host.trim() : "";
        this.port = port;
        this.username = username != null ? username.trim() : "";
        this.password = password != null ? password.trim() : "";
        this.fromAddress = fromAddress != null ? fromAddress.trim() : "no-reply@balancevault.com";
        this.auth = auth;
        this.starttls = starttls;
        this.devMode = devMode;
    }

    @Override
    public boolean isConfigured() {
        return (!host.isEmpty() && port > 0) || devMode;
    }

    private JavaMailSenderImpl createMailSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(auth));
        props.put("mail.smtp.starttls.enable", String.valueOf(starttls));
        props.put("mail.debug", "false");
        return sender;
    }

    @Override
    public void sendRegistrationOtp(String toEmail, String fullName, String otp) {
        if (!isConfigured()) {
            log.error("Email service requested for OTP verification, but SMTP host is not configured.");
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email verification service is currently unconfigured. Please configure SMTP_HOST, SMTP_PORT, and SMTP credentials in the server environment."
            );
        }

        if (devMode && host.isEmpty()) {
            log.info("[DEV MODE] Simulated sending registration OTP to email: {} for customer: {} (OTP delivery suppressed from production logs)", toEmail, fullName);
            return;
        }

        try {
            JavaMailSenderImpl mailSender = createMailSender();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, "BalanceVault Security");
            helper.setTo(toEmail);
            helper.setSubject("Your BalanceVault Verification Code");

            String htmlBody = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #EAE2F2; border-radius: 16px; background-color: #FFFFFF;">
                    <div style="margin-bottom: 24px;">
                        <h2 style="color: #1F1635; margin: 0; font-size: 20px;">BalanceVault Customer Verification</h2>
                        <p style="color: #6B5E87; font-size: 13px; margin-top: 4px;">Secure. Smart. Trusted.</p>
                    </div>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">Hello <strong>%s</strong>,</p>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">Please use the following single-use verification code to complete your customer account registration. This code expires in <strong>10 minutes</strong>.</p>
                    <div style="margin: 24px 0; text-align: center;">
                        <span style="display: inline-block; padding: 12px 28px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #7C3AED; background-color: #F8F5FC; border: 2px dashed #DCCBF2; border-radius: 12px; font-family: monospace;">
                            %s
                        </span>
                    </div>
                    <p style="color: #81758F; font-size: 12px; line-height: 1.4;">If you did not initiate this registration request, please disregard this email. Do not share this code with anyone; BalanceVault personnel will never request your verification code.</p>
                    <hr style="border: 0; border-top: 1px solid #EAE2F2; margin: 24px 0;" />
                    <p style="color: #9C92B3; font-size: 11px; text-align: center; margin: 0;">&copy; 2026 BalanceVault. High-Assurance Financial Ledger Systems.</p>
                </div>
            """, fullName, otp);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Successfully dispatched OTP verification email to recipient: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to transmit verification email to recipient {}: {}", toEmail, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to deliver verification email. Please verify SMTP server settings.");
        }
    }

    @Override
    public void sendAccountCreationSuccessEmail(String toEmail, String fullName, String accountNumber, String createdAtFormatted) {
        if (!isConfigured()) {
            log.warn("Account creation confirmation email skipped: SMTP service is not configured.");
            return;
        }

        if (devMode && host.isEmpty()) {
            log.info("[DEV MODE] Simulated sending account creation confirmation email to: {}", toEmail);
            return;
        }

        try {
            JavaMailSenderImpl mailSender = createMailSender();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, "BalanceVault Security");
            helper.setTo(toEmail);
            helper.setSubject("Welcome to BalanceVault – Account Activated");

            String maskedAccount = accountNumber.length() > 4
                    ? "•••• •••• " + accountNumber.substring(accountNumber.length() - 4)
                    : accountNumber;

            String htmlBody = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #EAE2F2; border-radius: 16px; background-color: #FFFFFF;">
                    <div style="margin-bottom: 24px;">
                        <h2 style="color: #1F1635; margin: 0; font-size: 20px;">Welcome to BalanceVault</h2>
                        <p style="color: #6B5E87; font-size: 13px; margin-top: 4px;">Institutional-Grade Capital Security</p>
                    </div>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">Dear <strong>%s</strong>,</p>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">Your BalanceVault customer account registration has been successfully verified, and your primary financial vault has been provisioned.</p>
                    <div style="margin: 20px 0; padding: 16px; background-color: #F8F5FC; border-radius: 12px; border: 1px solid #EAE2F2;">
                        <table style="width: 100%%; font-size: 13px; color: #30283D;">
                            <tr>
                                <td style="color: #6B5E87; padding-bottom: 8px;">Account Identifier:</td>
                                <td style="font-weight: bold; font-family: monospace; text-align: right; padding-bottom: 8px;">%s</td>
                            </tr>
                            <tr>
                                <td style="color: #6B5E87; padding-bottom: 8px;">Activation Timestamp:</td>
                                <td style="font-weight: bold; text-align: right; padding-bottom: 8px;">%s</td>
                            </tr>
                            <tr>
                                <td style="color: #6B5E87;">Audit Status:</td>
                                <td style="font-weight: bold; color: #23875A; text-align: right;">Append-Only Verified</td>
                            </tr>
                        </table>
                    </div>
                    <div style="margin: 20px 0; padding: 12px; background-color: #FFFBEB; border-left: 4px solid #D69B36; border-radius: 6px; font-size: 12px; color: #78350F;">
                        <strong>Security Reminder:</strong> BalanceVault will never ask for your password or credentials. If you did not initiate this registration, please contact our security team immediately.
                    </div>
                    <hr style="border: 0; border-top: 1px solid #EAE2F2; margin: 24px 0;" />
                    <p style="color: #9C92B3; font-size: 11px; text-align: center; margin: 0;">&copy; 2026 BalanceVault. All rights reserved.</p>
                </div>
            """, fullName, maskedAccount, createdAtFormatted);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Successfully dispatched account activation confirmation email to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to transmit account activation email to {}: {}", toEmail, e.getMessage());
            // Safe failure: do not throw to avoid rolling back completed user registration
        }
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetToken, String resetUrl) {
        if (!isConfigured()) {
            log.error("Email service requested for password reset, but SMTP host is not configured.");
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email recovery service is currently unconfigured. Please configure SMTP credentials in the server environment."
            );
        }

        if (devMode && host.isEmpty()) {
            log.info("[DEV MODE] Simulated sending password reset email to: {} for customer: {} (token delivery suppressed from production logs)", toEmail, fullName);
            return;
        }

        try {
            JavaMailSenderImpl mailSender = createMailSender();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, "BalanceVault Security");
            helper.setTo(toEmail);
            helper.setSubject("Reset Your BalanceVault Password");

            String htmlBody = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #EAE2F2; border-radius: 16px; background-color: #FFFFFF;">
                    <div style="margin-bottom: 24px;">
                        <h2 style="color: #1F1635; margin: 0; font-size: 20px;">BalanceVault Password Recovery</h2>
                        <p style="color: #6B5E87; font-size: 13px; margin-top: 4px;">Secure Account Access Recovery</p>
                    </div>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">Hello <strong>%s</strong>,</p>
                    <p style="color: #30283D; font-size: 14px; line-height: 1.5;">We received a request to reset the password for your BalanceVault account. This single-use reset authorization is valid for <strong>15 minutes</strong>.</p>
                    
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="%s" style="background-color: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-weight: bold; font-size: 14px; border-radius: 10px; display: inline-block;">Reset Password</a>
                    </div>
                    
                    <div style="margin: 20px 0; padding: 14px; background-color: #F8F5FC; border-radius: 10px; border: 1px solid #EAE2F2;">
                        <p style="color: #6B5E87; font-size: 12px; margin: 0 0 6px 0;">Alternatively, copy and paste this reset authorization token directly into the recovery form:</p>
                        <p style="font-family: monospace; font-size: 13px; color: #1F1635; background: #FFFFFF; padding: 8px 12px; border-radius: 6px; border: 1px solid #DDD6FE; word-break: break-all; margin: 0;">%s</p>
                    </div>

                    <div style="margin: 20px 0; padding: 12px; background-color: #FFFBEB; border-left: 4px solid #D69B36; border-radius: 6px; font-size: 12px; color: #78350F;">
                        <strong>Security Notice:</strong> If you did not initiate this request, you can safely ignore this email. Your current password remains active and secure.
                    </div>
                    <hr style="border: 0; border-top: 1px solid #EAE2F2; margin: 24px 0;" />
                    <p style="color: #9C92B3; font-size: 11px; text-align: center; margin: 0;">&copy; 2026 BalanceVault. All rights reserved.</p>
                </div>
            """, fullName != null ? fullName : "Customer", resetUrl, resetToken);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Successfully dispatched password reset email to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to transmit password reset email to {}: {}", toEmail, e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to dispatch password reset email at this time. Please try again later.");
        }
    }
}

