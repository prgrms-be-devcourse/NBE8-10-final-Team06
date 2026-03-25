package com.devstagram.domain.post.repository;

import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.post.entity.Post;

import jakarta.persistence.LockModeType;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    Slice<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Post p WHERE p.id = :id")
    Optional<Post> findByIdWithLock(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount + 1 WHERE p.id = :postId")
    void incrementLikeCount(@Param("postId") Long postId);

    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount - 1 WHERE p.id = :postId")
    void decrementLikeCount(@Param("postId") Long postId);

    long countByUserId(Long userId);

    @Query("select distinct p from Post p " + "join fetch p.user "
            + // 게시글 작성자 정보
            "left join fetch p.mediaList "
            + // 게시글 이미지/영상 리스트
            "left join fetch p.techTags pt "
            + // 기술 매핑 테이블 (PostTechnology)
            "left join fetch pt.technology "
            + // 실제 기술 정보 (Technology)
            "where p.id = :id and p.isDeleted = false")
    Optional<Post> findPostWithDetails(@Param("id") Long id);
}
