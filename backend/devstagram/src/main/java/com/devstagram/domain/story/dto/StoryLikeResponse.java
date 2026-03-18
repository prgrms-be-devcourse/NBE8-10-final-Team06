package com.devstagram.domain.story.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class StoryLikeResponse {
    private Long storyId;
    private Long totalLikeCount;
    private Boolean isLiked; // 좋아요 눌렀는지/취소했는지 여부
}
