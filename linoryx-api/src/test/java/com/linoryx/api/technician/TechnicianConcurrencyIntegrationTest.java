package com.linoryx.api.technician;

import com.linoryx.api.audit.repository.AuditLogRepository;
import com.linoryx.api.technician.repository.TechnicianProfileRepository;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.repository.UserRepository;
import com.linoryx.api.user.service.UserService;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TechnicianConcurrencyIntegrationTest {
    @Autowired UserRepository accounts;
    @Autowired UserService users;
    @Autowired TechnicianProfileRepository profiles;
    @Autowired AuditLogRepository audit;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void concurrentRoleGrantsCreateOneProfileAndOneRoleAuditEntry() throws Exception {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        User[] fixtures = transaction.execute(status -> new User[]{
                accounts.save(new User(UUID.randomUUID() + "@v2.invalid", "hash", "Test", "Admin", UserRole.ADMIN)),
                accounts.save(new User(UUID.randomUUID() + "@v2.invalid", "hash", "Test", "Target", UserRole.USER))
        });
        User admin = fixtures[0];
        User target = fixtures[1];
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<Object> grant = () -> {
                start.await();
                return users.changeUserRole(admin.getEmail(), target.getId(), UserRole.TECHNICIAN);
            };
            Future<?> first = executor.submit(grant);
            Future<?> second = executor.submit(grant);
            start.countDown();
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
            transaction.executeWithoutResult(status -> {
                assertNotNull(profiles.findByUserId(target.getId()).orElseThrow());
                assertEquals(1, audit.findAll().stream().filter(entry -> entry.getTargetUser() != null
                        && entry.getTargetUser().getId().equals(target.getId())).count());
            });
        } finally {
            transaction.executeWithoutResult(status -> {
                for (var entry : audit.findAll()) {
                    if (entry.getActor() != null && entry.getActor().getId().equals(admin.getId())) audit.delete(entry);
                }
                profiles.findByUserId(target.getId()).ifPresent(profiles::delete);
                profiles.flush();
                accounts.deleteById(target.getId());
                accounts.deleteById(admin.getId());
            });
        }
    }
}
