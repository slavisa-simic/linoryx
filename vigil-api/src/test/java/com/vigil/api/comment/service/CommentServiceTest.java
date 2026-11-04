package com.vigil.api.comment.service;

import com.vigil.api.audit.service.AuditService;
import com.vigil.api.comment.domain.Comment;
import com.vigil.api.comment.dto.CommentResponse;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.repository.CommentRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserService userService;

    @Mock
    private AuditService auditService;

    @Mock private CustomerReportRepository reports;
    @InjectMocks
    private CommentService commentService;

    @Test
    void addComment_whenIncidentDoesNotExist_throwsResourceNotFoundException() {

        Long incidentId = 999L;
        String email = "user@test.com";

        User user = mock(User.class);
        when(user.getRole()).thenReturn(UserRole.ADMIN);

        CreateCommentRequest request =
                new CreateCommentRequest("Checked logs");

        when(userService.getActiveUser(email))
                .thenReturn(user);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> commentService.addComment(
                        incidentId,
                        request,
                        email
                )
        );

    }

    @Test
    void addComment_whenRegularUser_throwsAccessDeniedException() {

        Long incidentId = 1L;
        String email = "user@test.com";

        User currentUser = mock(User.class);

        CreateCommentRequest request =
                new CreateCommentRequest("Checked logs");

        when(userService.getActiveUser(email))
                .thenReturn(currentUser);

        when(currentUser.getRole())
                .thenReturn(UserRole.USER);

        assertThrows(
                AccessDeniedException.class,
                () -> commentService.addComment(
                        incidentId,
                        request,
                        email
                )
        );
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "DISPATCHER"})
    void operatorsCanReadCommentsWithoutOwningOrBeingAssignedTheIncident(UserRole role) {
        User operator = new User("operator@test.com", "hash", "Test", "Operator", role);
        Incident incident = mock(Incident.class);
        var pageable = PageRequest.of(0, 20);
        when(userService.getActiveUser(operator.getEmail())).thenReturn(operator);
        when(incidentRepository.findById(1L)).thenReturn(Optional.of(incident));
        when(commentRepository.findByIncidentIdOrderByCreatedAtAsc(1L, pageable)).thenReturn(Page.empty(pageable));

        assertTrue(commentService.getIncidentComments(1L, operator.getEmail(), pageable).isEmpty());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "DISPATCHER"})
    void addComment_whenOperatorAddsComment_returnsCommentResponse(UserRole role) {

        Long incidentId = 1L;
        String email = "admin@test.com";

        User admin = mock(User.class);
        Incident incident = mock(Incident.class);
        Comment savedComment = mock(Comment.class);

        CreateCommentRequest request =
                new CreateCommentRequest("Checked authentication logs");

        when(userService.getActiveUser(email))
                .thenReturn(admin);

        when(admin.getRole())
                .thenReturn(role);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.of(incident));

        when(commentRepository.save(any(Comment.class)))
                .thenReturn(savedComment);

        when(savedComment.getId())
                .thenReturn(5L);

        when(savedComment.getIncident())
                .thenReturn(incident);

        when(incident.getId())
                .thenReturn(incidentId);

        when(savedComment.getAuthor())
                .thenReturn(admin);

        when(admin.getId())
                .thenReturn(2L);

        when(admin.getFirstName())
                .thenReturn("Ana");

        when(admin.getLastName())
                .thenReturn("Admin");

        when(savedComment.getContent())
                .thenReturn("Checked authentication logs");

        CommentResponse response =
                commentService.addComment(
                        incidentId,
                        request,
                        email
                );

        assertEquals(5L, response.id());
        assertEquals(1L, response.incidentId());
        assertEquals("Checked authentication logs", response.content());
    }
}
