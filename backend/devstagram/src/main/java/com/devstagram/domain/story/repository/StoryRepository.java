package com.devstagram.domain.story.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.story.entity.Story;

public interface StoryRepository extends JpaRepository<Story, Long> {

    // 활성 스토리 조회
    List<Story> findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(Long userId);

    // 만료된 스토리 조회
    List<Story> findAllByUserIdAndIsDeletedTrueOrderByCreatedAtDesc(Long userId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Story s SET s.isDeleted = true " + "WHERE s.expiredAt <= :now AND s.isDeleted = false")
    void SoftDeleteAllExpiredStories(@Param("now") LocalDateTime now);
}
