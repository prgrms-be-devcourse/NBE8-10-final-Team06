package com.devstagram.domain.story.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.user.entity.User;

public interface StoryRepository extends JpaRepository<Story, Long> {

    // 활성 스토리 조회
    List<Story> findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(Long userId);

    // 만료된 스토리 조회
    List<Story> findAllByUserIdAndIsDeletedTrueOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndIsDeletedFalseAndExpiredAtAfter(Long userId, LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Story s SET s.isDeleted = true " + "WHERE s.expiredAt <= :now AND s.isDeleted = false")
    void softDeleteAllExpiredStories(@Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Story s SET s.likeCount = s.likeCount + 1 WHERE s.id = :id")
    void increaseLikeCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Story s SET s.likeCount = s.likeCount - 1 WHERE s.id = :id AND s.likeCount > 0")
    void decreaseLikeCount(@Param("id") Long id);

    // 내가 팔로우하는 유저들& 활성화된 스토리 가진 유저 목록
    @Query("""
        SELECT DISTINCT s.user FROM Story s
        JOIN Follow f ON s.user.id = f.toUser.id
        WHERE f.fromUser.id = :currentUserId
        AND s.isDeleted = false
        AND s.expiredAt > :now
    """)
    List<User> findFolloweesWithActiveStories(
            @Param("currentUserId") Long currentUserId, @Param("now") LocalDateTime now);

    // 특정 유저의 활성화된 스토리 중에 내가 안 본 게 있는지
    @Query("""
        SELECT COUNT(s) > 0 FROM Story s
        WHERE s.user.id = :targetUserId
        AND s.isDeleted = false
        AND s.expiredAt > :now
        AND NOT EXISTS (
            SELECT sv FROM StoryViewed sv
            WHERE sv.story.id = s.id AND sv.user.id = :currentUserId
        )
    """)
    boolean existsUnreadStory(
            @Param("targetUserId") Long targetUserId,
            @Param("currentUserId") Long currentUserId,
            @Param("now") LocalDateTime now);

    // 특정 유저의 스토리 중에 가장 최근의 생성 시간 가져옴
    @Query("""
        SELECT MAX(s.createdAt)
        FROM Story s
        WHERE s.user.id = :userId
        AND s.isDeleted = false
        AND s.expiredAt > :now
    """)
    LocalDateTime findLastStoryCreatedAt(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
