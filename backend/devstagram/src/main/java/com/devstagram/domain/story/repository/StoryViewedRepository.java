package com.devstagram.domain.story.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.StoryViewed;

public interface StoryViewedRepository extends JpaRepository<StoryViewed, Long> {

    Optional<StoryViewed> findByStoryIdAndUserId(Long storyId, Long userId);

    List<StoryViewed> findByUserIdAndStoryIdIn(Long userId, List<Long> storyIds);
}
