package com.devstagram.domain.post.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostUpdateReq(
        @NotBlank(message = "제목을 입력하세요.") @Size(max = 255, message = "제목은 255자 이내로 입력하세요.") String title,

        @NotBlank(message = "글을 입력하세요.") String content,
        List<Long> techIds) {}
