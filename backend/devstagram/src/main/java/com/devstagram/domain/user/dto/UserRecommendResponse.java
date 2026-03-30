package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserRecommendResponse {
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private boolean isFollowing;

    public static UserRecommendResponse from(User user, boolean isFollowing) {
        return UserRecommendResponse.builder()
                .userId(user.getId())
                .nickname(user.getNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .isFollowing(isFollowing)
                .build();
    }
}
