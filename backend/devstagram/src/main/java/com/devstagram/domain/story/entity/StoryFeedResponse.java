package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;

import lombok.Builder;

@Builder
public record StoryFeedResponse(
        Long userId,
        String nickname,
        // 스토리 바에 띄울 작성자 프로필 이미지
        String profileImageUrl,
        boolean isUnread, // 아직 안 읽은 스토리 있는지 여부
        int totalStoryCount, // 스토리 바에 띄울, 이 유저의 총 스토리 갯수 계산
        LocalDateTime lastUpdatedAt // 가장 최근 스토리 생성 시간
        ) {}
