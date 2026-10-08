package com.vigil.api.comment.service;

import com.vigil.api.audit.service.AuditService;
import com.vigil.api.comment.domain.Comment;
import com.vigil.api.comment.dto.CommentResponse;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.repository.CommentRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

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

    @InjectMocks
    private CommentService commentService;

    @Test
    void addComment_whenIncidentDoesNotExist_throwsResourceNotFoundException() {

        Long incidentId = 999L;
        String email = "user@test.com";

        User user = mock(User.class);

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
    void addComment_whenUserDoesNotOwnIncident_throwsAccessDeniedException() {

        Long incidentId = 1L;
        String email = "user@test.com";

        User currentUser = mock(User.class);
        User creator = mock(User.class);
        Incident incident = mock(Incident.class);

        CreateCommentRequest request =
                new CreateCommentRequest("Checked logs");

        when(userService.getActiveUser(email))
                .thenReturn(currentUser);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.of(incident));

        when(currentUser.getRole())
                .thenReturn(UserRole.USER);

        when(currentUser.getId())
                .thenReturn(10L);

        when(incident.getCreatedBy())
                .thenReturn(creator);

        when(creator.getId())
                .thenReturn(20L);

        assertThrows(
                AccessDeniedException.class,
                () -> commentService.addComment(
                        incidentId,
                        request,
                        email
                )
        );
    }

    @Test
    void addComment_whenAdminAddsComment_returnsCommentResponse() {

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
                .thenReturn(UserRole.ADMIN);

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