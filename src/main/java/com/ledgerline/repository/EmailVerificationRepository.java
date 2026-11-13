package com.ledgerline.repository;

import com.ledgerline.model.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findByEmailIgnoreCase(String email);
    Optional<EmailVerification> findByUsername(String username);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUsername(String username);
    void deleteByEmailIgnoreCase(String email);
}

