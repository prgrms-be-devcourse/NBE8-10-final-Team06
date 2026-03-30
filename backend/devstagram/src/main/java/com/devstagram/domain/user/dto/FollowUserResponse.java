package com.devstagram.domain.user.dto;

import java.util.Optional;

import com.devstagram.domain.user.entity.User;

public record FollowUserResponse(Long userId, String nickname, String profileImageUrl, boolean isFollowing) {
    public static FollowUserResponse of(User user, boolean isFollowing) {
        return new FollowUserResponse(
                user.getId(),
                user.getNickname(),
                Optional.ofNullable(user.getProfileImageUrl()).orElse("/default-profile.png"),
                isFollowing);
    }
}
