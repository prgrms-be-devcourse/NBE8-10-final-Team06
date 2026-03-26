package com.devstagram.domain.comment.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.comment.entity.CommentLike;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    // 현재 사용자가 특정 댓글들에 좋아요를 눌렀는지 일괄 조회 (N+1 방지용)
    @Query("SELECT cl.comment.id FROM CommentLike cl " + "WHERE cl.user.id = :userId AND cl.comment.id IN :commentIds")
    Set<Long> findAllCommentIdsByUserIdAndCommentIds(
            @Param("userId") Long userId, @Param("commentIds") List<Long> commentIds);
}
