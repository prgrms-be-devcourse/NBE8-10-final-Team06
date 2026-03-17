package com.devstagram.domain.post.dto;

import jakarta.validation.constraints.NotBlank;

public record PostUpdateReq(
        @NotBlank(message = "제목을 입력하세요.") String title,
        @NotBlank(message = "글을 입력하세요.") String content) {}
