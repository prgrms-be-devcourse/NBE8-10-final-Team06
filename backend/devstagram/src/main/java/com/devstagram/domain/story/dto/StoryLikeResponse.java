package com.devstagram.domain.story.dto;

import lombok.Builder;

@Builder
public record StoryLikeResponse(Long storyId, Long totalLikeCount, Boolean isLiked) {}
