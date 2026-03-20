package com.devstagram.domain.comment.repository;

import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.comment.entity.Comment;

import jakarta.persistence.LockModeType;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("select c from Comment c " + "join fetch c.user m "
            + "where c.post.id = :postId and c.parent is null ")
    Slice<Comment> findCommentsWithUserAndImageByPostId(@Param("postId") Long postId, Pageable pageable);

    @Query("select r from Comment r " + "join fetch r.user m "
            + "where r.parent.id = :parentId ")
    Slice<Comment> findRepliesWithUserAndImageByParentId(@Param("parentId") Long parentId, Pageable pageable);

    @Modifying
    @Query("delete from Comment c where c.post.id = :postId and c.parent is not null")
    void deleteRepliesByPostId(@Param("postId") Long postId);

    @Modifying
    @Query("delete from Comment c where c.post.id = :postId and c.parent is null")
    void deleteParentsByPostId(@Param("postId") Long postId);

    boolean existsByParent(Comment parent);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.id = :id")
    Optional<Comment> findByIdWithLock(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount + 1 WHERE c.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount - 1 WHERE c.id = :id")
    void decrementLikeCount(@Param("id") Long id);
}
