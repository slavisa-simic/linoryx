package com.linoryx.api.comment.repository;

import com.linoryx.api.comment.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByIncidentIdOrderByCreatedAtAsc(
            Long incidentId,
            Pageable pageable
    );
}
