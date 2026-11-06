package com.ledgerline;

import com.ledgerline.model.Account;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccountAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    private Account accountA;
    private Account accountB;

    @BeforeEach
    void setUp() {
        accountRepository.deleteAll();
        userRepository.deleteAll();

        User userA = userRepository.save(new User("userA", "userA@example.com", "passA", Role.ACCOUNT_HOLDER));
        User userB = userRepository.save(new User("userB", "userB@example.com", "passB", Role.ACCOUNT_HOLDER));

        accountA = accountRepository.save(new Account("AC1111111111", userA, "USD", new BigDecimal("100.5000")));
        accountB = accountRepository.save(new Account("AC2222222222", userB, "USD", new BigDecimal("250.7500")));
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("User A reading User B's account returns 404 (not 403) to prevent ID leakage")
    void userATryingToReadUserBAccount_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + accountB.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("User A reading User B's balance returns 404 (not 403) to prevent ID leakage")
    void userATryingToReadUserBBalance_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + accountB.getId() + "/balance"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "userA", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("User A reading own account succeeds with 200 and accurate BigDecimal balance")
    void userAReadingOwnAccount_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + accountA.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(accountA.getId()))
                .andExpect(jsonPath("$.balance").value(100.5000));
    }

    @Test
    @WithMockUser(username = "auditor_user", roles = {"AUDITOR"})
    @DisplayName("AUDITOR can read any account and balance")
    void auditorCanReadAnyAccount_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + accountB.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(accountB.getId()))
                .andExpect(jsonPath("$.balance").value(250.7500));
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    @DisplayName("ADMIN can read any account and balance")
    void adminCanReadAnyAccount_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + accountA.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(accountA.getId()));

        mockMvc.perform(get("/api/v1/accounts/" + accountB.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(accountB.getId()));
    }
}

