package com.vigil.api.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


// incidentId iz URL-a, author iz JWT-a, dok createdAt postavlja server
public record CreateCommentRequest(
        @NotBlank
        @Size(max = 2000)
        String content
) {

}
