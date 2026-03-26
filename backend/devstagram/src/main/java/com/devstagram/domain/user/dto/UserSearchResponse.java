package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;
import java.util.Optional;

public record UserSearchResponse(
        Long userId,
        String nickname,
        String profileImageUrl,
        boolean isFollowing
) {
    public static UserSearchResponse of(User user, boolean isFollowing) {
        return new UserSearchResponse(
                user.getId(),
                user.getNickname(),
                Optional.ofNullable(user.getProfileImageUrl()).orElse("/default-profile.png"),
                isFollowing
        );
    }
}