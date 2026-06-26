package com.devstagram.domain.user.dto;

import java.util.Optional;

import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserDocument;

public record UserSearchResponse(Long userId, String nickname, String profileImageUrl, boolean isFollowing) {
    public static UserSearchResponse of(User user, boolean isFollowing) {
        return new UserSearchResponse(
                user.getId(),
                user.getNickname(),
                Optional.ofNullable(user.getProfileImageUrl()).orElse("/default-profile.png"),
                isFollowing);
    }

    public static UserSearchResponse of(UserDocument doc, boolean isFollowing) {
        return new UserSearchResponse(
                doc.getId(),
                doc.getNickname(),
                Optional.ofNullable(doc.getProfileImageUrl()).orElse("/default-profile.png"),
                isFollowing);
    }
}

