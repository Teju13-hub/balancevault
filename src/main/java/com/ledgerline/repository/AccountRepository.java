package com.ledgerline.repository;

import com.ledgerline.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByIdAndUser_Username(Long id, String username);
    Optional<Account> findByAccountNumber(String accountNumber);
    List<Account> findAllByUser_Username(String username);
    boolean existsByAccountNumber(String accountNumber);
}

