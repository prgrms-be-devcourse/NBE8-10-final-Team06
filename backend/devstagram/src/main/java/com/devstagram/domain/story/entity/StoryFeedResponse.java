package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;

import lombok.Builder;

@Builder
public record StoryFeedResponse(
        Long userId,
        String nickname,
        boolean isUnread, // 아직 안 읽은 스토리 있는지 여부
        LocalDateTime lastUpdatedAt // 가장 최근 스토리 생성 시간
        ) {}
