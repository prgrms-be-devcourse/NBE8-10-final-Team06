package com.devstagram.domain.post.repository;

import java.util.List;
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

    // 전체 피드 조회: 삭제되지 않은 게시글만 최신순으로
    Slice<Post> findAllByIsDeletedFalseOrderByCreatedAtDesc(Pageable pageable);

    // 비관적 잠금: 단건 조회 시 사용
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Post p WHERE p.id = :id AND p.isDeleted = false")
    Optional<Post> findByIdWithLock(@Param("id") Long id);

    // 좋아요 벌크 업데이트
    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount + 1 WHERE p.id = :postId")
    void incrementLikeCount(@Param("postId") Long postId);

    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount - 1 WHERE p.id = :postId")
    void decrementLikeCount(@Param("postId") Long postId);

    // 상세 조회: 페치 조인
    @Query("select distinct p from Post p " + "join fetch p.user "
            + "left join fetch p.mediaList "
            + "left join fetch p.techTags pt "
            + "left join fetch pt.technology "
            + "where p.id = :id and p.isDeleted = false")
    Optional<Post> findPostWithDetails(@Param("id") Long id);

    // 특정 ID 리스트 조회: 삭제되지 않은 것만
    List<Post> findAllByIdInAndIsDeletedFalse(List<Long> ids);

    // 특정 유저의 게시글(프로필 그리드): 삭제되지 않은 것만
    Slice<Post> findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
