package com.vigil.api.comment.service;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.comment.domain.Comment;
import com.vigil.api.comment.dto.CommentResponse;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.repository.CommentRepository;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public CommentService(CommentRepository commentRepository, IncidentRepository incidentRepository, UserRepository userRepository, AuditService auditService) {
        this.commentRepository = commentRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public CommentResponse addComment(
        Long incidentId,
        CreateCommentRequest request,
        String currentUserEmail
    ) {

        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        User author = userRepository
                .findByEmail(currentUserEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "User not found!"
                        )
                );

        ensureCanAccessComments(
                incident,
                author
        );

        Comment comment = new Comment(
                incident,
                author,
                request.content()
        );

        Comment savedComment =
                commentRepository.save(comment);

        auditService.log(
                incident,
                author,
                AuditAction.COMMENT_ADDED
        );

        return toResponse(savedComment);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getIncidentComments(
            Long incidentId,
            String currentUserEmail,
            Pageable pageable
    ) {

        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        User currentUser = userRepository
                .findByEmail(currentUserEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "User not found!"
                        )
                );

        ensureCanAccessComments(
                incident,
                currentUser
        );

        return commentRepository
                .findByIncidentIdOrderByCreatedAtAsc(
                        incidentId,
                        pageable
                )
                .map(this::toResponse);
    }

    private void ensureCanAccessComments(
            Incident incident,
            User currentUser
    ) {

        if (currentUser.getRole() == UserRole.ADMIN) {
            return;
        }

        if (currentUser.getRole() == UserRole.USER) {

            if (incident.getCreatedBy()
                    .getId()
                    .equals(currentUser.getId())) {
                return;
            }

            throw new AccessDeniedException(
                    "You cannot access comments for this incident"
            );
        }

        if (currentUser.getRole() == UserRole.TECHNICIAN) {

            if (incident.getAssignedTo() != null &&
                    incident.getAssignedTo()
                            .getId()
                            .equals(currentUser.getId())) {
                return;
            }

            throw new AccessDeniedException(
                    "You cannot access comments for this incident"
            );
        }

        throw new AccessDeniedException(
                "Access denied"
        );
    }

    public CommentResponse toResponse(
            Comment comment
    ){

        return new CommentResponse(
                comment.getId(),
                comment.getIncident().getId(),

                comment.getAuthor().getId(),
                comment.getAuthor().getFirstName(),
                comment.getAuthor().getLastName(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}