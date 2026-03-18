package com.devstagram.domain.story.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class StoryDetailResponse {
    private Long storyId;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime expiredAt;
    private String content;
    private List<Long> tagedUserIds;

    private Long totalLikeCount;
    private Boolean isLiked;
}
