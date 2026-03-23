package com.devstagram.domain.story.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.devstagram.global.enumtype.MediaType;

import lombok.Builder;

@Builder
public record StoryDetailResponse(
        Long storyId,
        Long userId,
        String mediaUrl,
        MediaType mediaType,
        LocalDateTime createdAt,
        LocalDateTime expiredAt,
        String content,
        List<Long> taggedUserIds,
        Long totalLikeCount,
        // 작성자만 볼 수 있는 좋아요 총 갯수
        Boolean isLiked,
        List<StoryViewerUserResponse> viewers,
        // 작성자만 볼 수 있는 본 유저 리스트
        List<StoryViewerUserResponse> likers
        // 작성자만 볼 수 있는 좋아요 누른 유저 리스트

        ) {}
