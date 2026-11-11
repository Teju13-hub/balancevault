package com.ledgerline.controller;

import com.ledgerline.dto.CreateTransferRequest;
import com.ledgerline.dto.TransferResponse;
import com.ledgerline.service.TransferService;
import com.ledgerline.service.TransferService.TransferExecutionResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    public ResponseEntity<TransferResponse> createTransfer(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateTransferRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String ipAddress = servletRequest.getRemoteAddr();

        try {
            TransferExecutionResult result = transferService.executeTransfer(
                    request,
                    idempotencyKey,
                    authentication.getName(),
                    authentication.getAuthorities(),
                    ipAddress
            );

            if (result.isReplay()) {
                return ResponseEntity.ok(result.getResponse());
            } else {
                return ResponseEntity.status(HttpStatus.CREATED).body(result.getResponse());
            }
        } catch (DataIntegrityViolationException ex) {
            // Concurrent idempotency key collision handling:
            // If another concurrent transaction committed with this key, return that transfer.
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                Optional<TransferResponse> existing = transferService.getTransferByIdempotencyKey(idempotencyKey.trim());
                if (existing.isPresent()) {
                    return ResponseEntity.ok(existing.get());
                }
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Concurrent duplicate transfer or idempotency collision detected", ex);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferResponse> getTransfer(
            @PathVariable Long id,
            Authentication authentication) {
        TransferResponse response = transferService.getTransfer(
                id,
                authentication.getName(),
                authentication.getAuthorities()
        );
        return ResponseEntity.ok(response);
    }
}
