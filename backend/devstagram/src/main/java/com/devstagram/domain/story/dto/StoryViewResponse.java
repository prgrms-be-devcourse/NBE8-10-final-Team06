package com.devstagram.domain.story.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.story.entity.StoryViewed;

import lombok.Builder;

@Builder
public record StoryViewResponse(
        Long storyId,
        Long userId,
        Long totalLikeCount,
        boolean isLiked,
        LocalDateTime viewedAt, // 최초 조회 시점
        LocalDateTime likedAt // 최근 좋아요 시점 (취소 시 null)
        ) {
    public static StoryViewResponse from(StoryViewed viewed) {
        return StoryViewResponse.builder()
                .storyId(viewed.getStory().getId())
                .userId(viewed.getUser().getId())
                .totalLikeCount(viewed.getStory().getLikeCount())
                .isLiked(viewed.isLiked())
                .viewedAt(viewed.getViewedAt())
                .likedAt(viewed.getLikedAt())
                .build();
    }
}
