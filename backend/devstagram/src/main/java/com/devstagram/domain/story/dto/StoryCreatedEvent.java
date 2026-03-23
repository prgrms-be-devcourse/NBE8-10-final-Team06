package com.devstagram.domain.story.dto;

import java.util.List;

import com.devstagram.domain.story.entity.Story;

public record StoryCreatedEvent(Story story, List<Long> taggedUserIds, Long creatorId) {}
