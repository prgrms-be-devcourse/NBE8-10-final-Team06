package com.devstagram.domain.story.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.story.entity.StoryMedia;

public interface StoryMediaRepository extends JpaRepository<StoryMedia, Long> {}
