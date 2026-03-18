package com.devstagram.domain.comment.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.comment.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("select c from Comment c " + "join fetch c.author m "
            + "left join fetch m.profileImage i "
            + "where c.post.id = :postId and c.parent is null "
            + "order by c.createDate desc")
    Slice<Comment> findCommentsWithMemberAndImageByPostId(@Param("postId") Long postId, Pageable pageable);

    @Query("select r from Comment r " + "join fetch r.author m "
            + "left join fetch m.profileImage i "
            + "where r.parent.id = :parentId "
            + "order by r.createDate asc")
    Slice<Comment> findRepliesWithMemberAndImageByParentId(@Param("parentId") Long parentId, Pageable pageable);

    /**
     * 특정 게시글의 모든 대댓글(자식)을 먼저 삭제합니다.
     */
    @Modifying
    @Query("delete from Comment c where c.post.id = :postId and c.parent is not null")
    void deleteRepliesByPostId(@Param("postId") Long postId);

    /**
     * 특정 게시글의 모든 일반 댓글(부모)을 삭제합니다.
     */
    @Modifying
    @Query("delete from Comment c where c.post.id = :postId and c.parent is null")
    void deleteParentsByPostId(@Param("postId") Long postId);

    boolean existsByParent(Comment parent);
}
