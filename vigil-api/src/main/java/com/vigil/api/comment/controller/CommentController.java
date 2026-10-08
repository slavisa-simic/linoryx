package com.vigil.api.comment.controller;

import com.vigil.api.comment.dto.CommentResponse;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.service.CommentService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents/{incidentId}/comments")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Comments", description = "Incident investigation comments")
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
    @PreAuthorize(
            "hasAnyRole('USER', 'TECHNICIAN', 'ADMIN')"
    )
    public Page<CommentResponse> getIncidentComments(
            @PathVariable Long incidentId,
            @AuthenticationPrincipal Jwt jwt,

            @ParameterObject
            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.ASC
            )
            Pageable pageable
    ) {

        return commentService.getIncidentComments(
                incidentId,
                jwt.getSubject(),
                pageable
        );
    }
}
