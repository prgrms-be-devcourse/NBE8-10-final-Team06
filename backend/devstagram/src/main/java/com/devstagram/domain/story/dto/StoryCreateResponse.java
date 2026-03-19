package com.devstagram.domain.story.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;

@Builder
public record StoryCreateResponse(
        Long storyId,
        Long userId,
        LocalDateTime createdAt,
        LocalDateTime expiredAt,
        String content,
        List<Long> taggedUserIds) {}
