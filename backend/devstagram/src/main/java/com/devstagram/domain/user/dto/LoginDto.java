package com.devstagram.domain.user.dto;

public record LoginDto(
        String accessToken,
        String apiKey,
        String email,
        String nickname
) {}