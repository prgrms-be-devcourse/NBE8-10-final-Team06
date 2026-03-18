package com.devstagram.domain.story.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.Story;

public interface StoryRepository extends JpaRepository<Story, Long> {
    List<Story> findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(Long userId);
}
