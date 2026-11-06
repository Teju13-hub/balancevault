package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.RegisterRequest;
import com.ledgerline.model.Role;
import com.ledgerline.model.User;
import com.ledgerline.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Unauthenticated request to protected endpoint returns 401 Unauthorized")
    void unauthenticatedRequest_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/status"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @WithMockUser(username = "acc_holder", roles = {"ACCOUNT_HOLDER"})
    @DisplayName("ACCOUNT_HOLDER calling an admin endpoint returns 403 Forbidden")
    void accountHolderCallingAdminEndpoint_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/status"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    @DisplayName("ADMIN calling admin endpoint returns 200 OK")
    void adminCallingAdminEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("Public registration creates strictly an ACCOUNT_HOLDER role")
    void publicRegistration_createsAccountHolderOnly() throws Exception {
        RegisterRequest request = new RegisterRequest("newuser", "newuser@example.com", "SecurePassword123!");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"))
                .andExpect(jsonPath("$.token").isNotEmpty());

        User user = userRepository.findByUsername("newuser").orElseThrow();
        assertEquals(Role.ACCOUNT_HOLDER, user.getRole());
    }
}

