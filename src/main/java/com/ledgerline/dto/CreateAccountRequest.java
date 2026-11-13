package com.ledgerline.dto;

public class CreateAccountRequest {

    private String currency = "INR";

    public CreateAccountRequest() {
    }

    public CreateAccountRequest(String currency) {
        this.currency = currency;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}

