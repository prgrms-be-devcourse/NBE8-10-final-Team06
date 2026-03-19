package com.devstagram.domain.user.dto;

public record LoginResponse(String accessToken, String apiKey, String email, String nickname) {}
