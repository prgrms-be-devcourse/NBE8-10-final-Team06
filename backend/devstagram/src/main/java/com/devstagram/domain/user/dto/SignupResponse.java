package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;

public record SignupResponse(
        Long id,
        String nickname,
        String email
) {
    public static SignupResponse from(User user) {
        return new SignupResponse(
                user.getId(),
                user.getNickname(),
                user.getEmail()
        );
    }
}