package com.devstagram.domain.post.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.entity.PostScrap;

public interface PostScrapRepository extends JpaRepository<PostScrap, Long> {

    // 존재 여부 확인용
    Optional<PostScrap> findByUserIdAndPostId(Long userId, Long postId);

    // 토글 로직에서 사용할 직접 삭제 메서드
    void deleteByUserIdAndPostId(Long userId, Long postId);

    @Query(
            value = "SELECT s.post FROM PostScrap s " + "WHERE s.user.id = :userId AND s.post.isDeleted = false "
                    + "ORDER BY s.createdAt DESC",
            countQuery = "SELECT count(s) FROM PostScrap s " + "WHERE s.user.id = :userId AND s.post.isDeleted = false")
    Page<Post> findActivePostsByUserId(@Param("userId") Long userId, Pageable pageable);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    @Query("SELECT pl.post.id FROM PostScrap pl WHERE pl.user.id = :userId AND pl.post.id IN :postIds")
    Set<Long> findAllPostIdsByUserIdAndPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);
}
