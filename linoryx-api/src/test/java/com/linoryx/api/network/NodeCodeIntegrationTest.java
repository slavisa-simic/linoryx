package com.linoryx.api.network;

import com.linoryx.api.network.domain.NodeType;
import com.linoryx.api.network.service.NodeCodeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class NodeCodeIntegrationTest {
    @Autowired NodeCodeService codes;
    @Autowired PlatformTransactionManager transactions;

    @Test
    void simultaneousReservationsAreUniqueAndSequentialPerCityAndType() throws Exception {
        String city = "Čačak " + UUID.randomUUID();
        String prefix = codes.cityCode(city) + "-OLT-";
        try (ExecutorService executor = Executors.newFixedThreadPool(6)) {
            List<Future<String>> futures = new ArrayList<>();
            for (int index = 0; index < 18; index++) {
                futures.add(executor.submit(() -> codes.generate(city, NodeType.GPON_OLT)));
            }
            Set<String> results = new HashSet<>();
            for (Future<String> future : futures) {
                results.add(future.get(15, TimeUnit.SECONDS));
            }
            assertEquals(18, results.size());
            assertTrue(results.contains(prefix + "001"));
            assertTrue(results.contains(prefix + "018"));
            assertTrue(codes.generate(city, NodeType.ROUTER).endsWith("-RTR-001"));
        }
        assertEquals("NOVISAD", codes.cityCode("Novi Sad"));
        assertEquals("BRCKO", codes.cityCode("Brčko"));
        assertEquals("DJAKOVO", codes.cityCode("Đakovo"));
    }

    @Test
    void rolledBackNodeCreationDoesNotRecycleItsReservedCode() {
        String city = "Rollback " + UUID.randomUUID();
        TransactionTemplate transaction = new TransactionTemplate(transactions);
        String reserved = transaction.execute(status -> {
            String code = codes.generate(city, NodeType.SWITCH);
            status.setRollbackOnly();
            return code;
        });
        assertNotNull(reserved);
        assertTrue(reserved.endsWith("-001"));
        assertTrue(codes.generate(city, NodeType.SWITCH).endsWith("-002"));
    }
}
