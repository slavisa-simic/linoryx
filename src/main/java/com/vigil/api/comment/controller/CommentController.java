package com.vigil.api.comment.controller;

import com.vigil.api.comment.dto.CommentResponse;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents/{incidentId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'TECHNICIAN', 'ADMIN')")
    public CommentResponse addComment(
            @PathVariable Long incidentId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ){
        return commentService.addComment(
                incidentId,
                request,
                jwt.getSubject()
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'TECHNICIAN', 'ADMIN')")
    public List<CommentResponse> getIncidentComments(
            @PathVariable Long incidentId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return commentService.getIncidentComments(
                incidentId,
                jwt.getSubject()
        );
    }
}
