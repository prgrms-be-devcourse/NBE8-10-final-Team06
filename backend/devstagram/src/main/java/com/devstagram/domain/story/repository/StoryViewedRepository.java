package com.devstagram.domain.story.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.story.entity.StoryViewed;
import com.devstagram.domain.user.entity.User;

public interface StoryViewedRepository extends JpaRepository<StoryViewed, Long> {

    Optional<StoryViewed> findByStoryAndUser(Story story, User user);

    // 유저가 스토리 봤는지 여부만
    boolean existsByStoryAndUser(Story story, User user);

    Optional<StoryViewed> findByStoryIdAndUserId(Long storyId, Long userId);

    List<StoryViewed> findByUserIdAndStoryIdIn(Long userId, List<Long> storyIds);
}
