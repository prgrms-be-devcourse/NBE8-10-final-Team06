package com.devstagram.domain.user.dto;

public record AuthResult(
        String accessToken,
        String refreshToken,
        LoginResponse response
) {
}