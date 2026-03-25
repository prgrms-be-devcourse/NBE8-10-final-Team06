package com.devstagram.domain.post.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record PostCreateReq(
        @NotBlank(message = "제목을 입력하세요.") String title,
        @NotBlank(message = "글을 입력하세요.") String content,
        List<Long> techIds) {}
