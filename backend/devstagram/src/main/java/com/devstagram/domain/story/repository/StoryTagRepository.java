package com.devstagram.domain.story.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.StoryTag;

public interface StoryTagRepository extends JpaRepository<StoryTag, Long> {}
