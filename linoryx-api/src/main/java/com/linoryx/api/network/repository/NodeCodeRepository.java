package com.linoryx.api.network.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NodeCodeRepository {
    private final JdbcTemplate jdbc;

    public NodeCodeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long nextNumber(String prefix) {
        // PostgreSQL locks the counter row and increments it atomically.
        return jdbc.queryForObject("""
                INSERT INTO node_code_counters (prefix, last_number) VALUES (?, 1)
                ON CONFLICT (prefix) DO UPDATE
                SET last_number = node_code_counters.last_number + 1
                RETURNING last_number
                """, Long.class, prefix);
    }
}
