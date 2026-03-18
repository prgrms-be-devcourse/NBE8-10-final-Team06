package com.devstagram.domain.comment.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentCreateReq(
        @NotBlank(message = "내용을 입력해주세요.")
        String content,
        Long authorId,
        Long parentCommentId
) {
}
