package com.devstagram.domain.story.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.story.entity.StoryViewed;

import lombok.Builder;

@Builder
public record StoryViewerUserResponse(
        Long userId, String nickname, boolean isLiked, LocalDateTime viewedAt, LocalDateTime likedAt) {
    public static StoryViewerUserResponse from(StoryViewed viewed) {
        return StoryViewerUserResponse.builder()
                .userId(viewed.getUser().getId())
                .nickname(viewed.getUser().getNickname())
                .isLiked(viewed.isLiked())
                .viewedAt(viewed.getViewedAt())
                .likedAt(viewed.getLikedAt())
                .build();
    }
}
