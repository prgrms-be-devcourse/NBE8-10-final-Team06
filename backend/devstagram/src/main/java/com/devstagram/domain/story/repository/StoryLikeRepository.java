package com.devstagram.domain.story.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.story.entity.StoryLike;
import com.devstagram.domain.user.entity.User;

public interface StoryLikeRepository extends JpaRepository<StoryLike, Long> {
    Optional<StoryLike> findByStoryAndUser(Story story, User user);
}
