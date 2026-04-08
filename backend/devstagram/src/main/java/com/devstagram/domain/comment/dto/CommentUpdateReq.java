package com.devstagram.domain.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentUpdateReq(
        @NotBlank(message = "내용을 입력해주세요.") @Size(max = 1000, message = "댓글은 1000자 이내로 입력해주세요.") String content) {}
