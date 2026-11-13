package com.ledgerline.dto;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    private String username;
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    public LoginRequest() {
    }

    public LoginRequest(String usernameOrEmail, String password) {
        if (usernameOrEmail != null && usernameOrEmail.contains("@")) {
            this.email = usernameOrEmail;
            this.username = usernameOrEmail;
        } else {
            this.username = usernameOrEmail;
            this.email = usernameOrEmail;
        }
        this.password = password;
    }

    public String getIdentifier() {
        if (email != null && !email.trim().isEmpty()) {
            return email.trim();
        }
        if (username != null && !username.trim().isEmpty()) {
            return username.trim();
        }
        return null;
    }

    public String getUsername() {
        return username != null ? username : email;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email != null ? email : username;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setIdentifier(String identifier) {
        if (identifier != null && identifier.contains("@")) {
            this.email = identifier.trim();
        } else {
            this.username = identifier != null ? identifier.trim() : null;
        }
    }

    public void setUsernameOrEmail(String usernameOrEmail) {
        setIdentifier(usernameOrEmail);
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
