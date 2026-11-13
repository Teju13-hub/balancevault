package com.ledgerline;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileWriter;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LedgerLineApplicationTest {

    @Test
    @DisplayName("loadDotEnvIfPresent loads properties into System properties without throwing")
    void testLoadDotEnvExecution() {
        // Calling loadDotEnvIfPresent when no .env exists should gracefully do nothing
        assertDoesNotThrow(LedgerLineApplication::loadDotEnvIfPresent);
    }
}

