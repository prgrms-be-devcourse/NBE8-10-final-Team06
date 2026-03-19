package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;

public record SignupResponse(Long id, String nickname, String email, String apiKey) {

    // 일반적인 조회용 (apiKey를 노출하지 않음)
    public static SignupResponse from(User user) {
        return new SignupResponse(user.getId(), user.getNickname(), user.getEmail(), null);
    }

    // 가입 직후 원본 키 전달용
    public static SignupResponse of(User user, String rawApiKey) {
        return new SignupResponse(user.getId(), user.getNickname(), user.getEmail(), rawApiKey);
    }
}