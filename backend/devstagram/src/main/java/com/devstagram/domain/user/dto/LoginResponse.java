package com.devstagram.domain.user.dto;

public record LoginResponse(
        String email,
        String nickname
) {
}