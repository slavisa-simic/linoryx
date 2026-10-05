package com.vigil.api.comment.dto;

import java.time.LocalDateTime;

public record CommentResponse (
        Long id,
        Long incidentId,

        Long authorId,
        String authorFirstName,
        String authorLastName,

        String content,
        LocalDateTime createdAt
){
}
