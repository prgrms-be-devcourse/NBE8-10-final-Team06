package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record ReplyInfoRes(
        String content, long userId, String nickname, LocalDateTime createdAt, LocalDateTime modifiedAt) {
    public ReplyInfoRes(Comment comment) {
        this(
                comment.getContent(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getCreatedAt(),
                comment.getModifiedAt());
    }
}
