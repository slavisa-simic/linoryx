package com.vigil.api.user.service;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.domain.AuditLog;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserManagementTest {
    @Mock private UserRepository userRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private IncidentRepository incidentRepository;
    @InjectMocks private UserService userService;

    private User user(long id, UserRole role) {
        User user = new User("user" + id + "@test.com", "hash", "Test", "User", role);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private User adminSession() {
        User admin = user(1, UserRole.ADMIN);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        return admin;
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void administratorCanChangeAnotherUsersRoleAndRecordsBothRoles(UserRole role) {
        User admin = adminSession();
        User target = user(2, UserRole.USER);
        if (role == UserRole.USER) {
            target.changeRole(UserRole.TECHNICIAN);
        }
        UserRole previousRole = target.getRole();
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.save(target)).thenReturn(target);

        var result = userService.changeUserRole(admin.getEmail(), 2L, role);

        assertEquals(role, result.role());
        ArgumentCaptor<AuditLog> log = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(log.capture());
        assertEquals(AuditAction.USER_ROLE_CHANGED, log.getValue().getAction());
        assertSame(admin, log.getValue().getActor());
        assertSame(target, log.getValue().getTargetUser());
        assertEquals(previousRole, log.getValue().getPreviousRole());
        assertEquals(role, log.getValue().getNewRole());
        assertNull(log.getValue().getIncident());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "ADMIN"})
    void cannotChangeTechnicianRoleWhileActiveIncidentsAreAssigned(UserRole role) {
        User admin = adminSession();
        User technician = user(2, UserRole.TECHNICIAN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(technician));
        when(incidentRepository.existsByAssignedToIdAndStatusIn(
                2L, List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
        )).thenReturn(true);

        var exception = assertThrows(IllegalStateException.class,
                () -> userService.changeUserRole(admin.getEmail(), 2L, role));

        assertTrue(exception.getMessage().contains("assigned incidents"));
        assertEquals(UserRole.TECHNICIAN, technician.getRole());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "ADMIN"})
    void canChangeTechnicianRoleWhenNoActiveIncidentsAreAssigned(UserRole role) {
        User admin = adminSession();
        User technician = user(2, UserRole.TECHNICIAN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(technician));
        when(incidentRepository.existsByAssignedToIdAndStatusIn(
                2L, List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
        )).thenReturn(false);
        when(userRepository.save(technician)).thenReturn(technician);

        assertEquals(role, userService.changeUserRole(admin.getEmail(), 2L, role).role());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void cannotDisableTechnicianWhileActiveIncidentsAreAssigned() {
        User admin = adminSession();
        User technician = user(2, UserRole.TECHNICIAN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(technician));
        when(incidentRepository.existsByAssignedToIdAndStatusIn(
                2L, List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
        )).thenReturn(true);

        var exception = assertThrows(IllegalStateException.class,
                () -> userService.disableUser(admin.getEmail(), 2L));

        assertTrue(exception.getMessage().contains("assigned incidents"));
        assertTrue(technician.isEnabled());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void canDisableTechnicianWhenNoActiveIncidentsAreAssigned() {
        User admin = adminSession();
        User technician = user(2, UserRole.TECHNICIAN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(technician));
        when(incidentRepository.existsByAssignedToIdAndStatusIn(
                2L, List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
        )).thenReturn(false);
        when(userRepository.save(technician)).thenReturn(technician);

        assertFalse(userService.disableUser(admin.getEmail(), 2L).enabled());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void cannotChangeOwnRole() {
        User admin = adminSession();
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        assertThrows(IllegalStateException.class,
                () -> userService.changeUserRole(admin.getEmail(), 1L, UserRole.USER));
        assertEquals(UserRole.ADMIN, admin.getRole());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void cannotDisableLastActiveAdmin() {
        User admin = adminSession();
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin));
        var exception = assertThrows(IllegalStateException.class,
                () -> userService.disableUser(admin.getEmail(), 1L));
        assertEquals("At least one active administrator must remain.", exception.getMessage());
        assertTrue(admin.isEnabled());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void cannotDisableOwnAccountEvenWhenAnotherAdminExists() {
        User admin = adminSession();
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin, user(2, UserRole.ADMIN)));
        assertThrows(IllegalStateException.class, () -> userService.disableUser(admin.getEmail(), 1L));
        assertTrue(admin.isEnabled());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void canDemoteAnotherAdminWhenActiveAdminRemains() {
        User admin = adminSession();
        User target = user(2, UserRole.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin, target));
        when(userRepository.save(target)).thenReturn(target);
        assertEquals(UserRole.USER, userService.changeUserRole(admin.getEmail(), 2L, UserRole.USER).role());
        assertEquals(UserRole.ADMIN, admin.getRole());
    }

    @Test
    void canDisableAnotherAdminWhenActiveAdminRemains() {
        User admin = adminSession();
        User target = user(2, UserRole.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin, target));
        when(userRepository.save(target)).thenReturn(target);
        assertFalse(userService.disableUser(admin.getEmail(), 2L).enabled());
        verify(auditLogRepository).save(any(AuditLog.class));
        assertTrue(admin.isEnabled());
    }

    @Test
    void enablesAccountAndRecordsAction() {
        User admin = adminSession();
        User target = user(2, UserRole.USER);
        target.disable();
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        when(userRepository.save(target)).thenReturn(target);
        assertTrue(userService.enableUser(admin.getEmail(), 2L).enabled());
        ArgumentCaptor<AuditLog> log = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(log.capture());
        assertEquals(AuditAction.USER_ENABLED, log.getValue().getAction());
        assertSame(admin, log.getValue().getActor());
        assertSame(target, log.getValue().getTargetUser());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void nonAdminCannotUseAnyManagementAction(UserRole role) {
        User actor = user(3, role);
        when(userRepository.findByEmail(actor.getEmail())).thenReturn(Optional.of(actor));
        assertThrows(AccessDeniedException.class, () -> userService.changeUserRole(actor.getEmail(), 2L, UserRole.ADMIN));
        assertThrows(AccessDeniedException.class, () -> userService.disableUser(actor.getEmail(), 2L));
        assertThrows(AccessDeniedException.class, () -> userService.enableUser(actor.getEmail(), 2L));
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void disabledAdminCannotManageUsers() {
        User admin = adminSession();
        admin.disable();
        assertThrows(UnauthorizedException.class, () -> userService.changeUserRole(admin.getEmail(), 2L, UserRole.ADMIN));
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void missingTargetReturnsNotFound() {
        User admin = adminSession();
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.changeUserRole(admin.getEmail(), 99L, UserRole.ADMIN));
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void unchangedRoleDoesNotCreateAuditEntry() {
        User admin = adminSession();
        User target = user(2, UserRole.USER);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        assertEquals(UserRole.USER, userService.changeUserRole(admin.getEmail(), 2L, UserRole.USER).role());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void onlyAdminCanReadUserList(UserRole role) {
        User actor = user(3, role);
        when(userRepository.findByEmail(actor.getEmail())).thenReturn(Optional.of(actor));
        assertThrows(AccessDeniedException.class, () -> userService.getAllUsers(actor.getEmail(), PageRequest.of(0, 20)));
    }

    @Test
    void adminCanReadUserList() {
        User admin = adminSession();
        var pageable = PageRequest.of(0, 20);
        when(userRepository.findAll(pageable)).thenReturn(Page.empty(pageable));
        assertTrue(userService.getAllUsers(admin.getEmail(), pageable).isEmpty());
    }
}
