package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record ReplyInfoRes(
        long id,
        String content,
        long parentCommentId,
        long authorId,
        String nickname,
        String email,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt) {
    public ReplyInfoRes(Comment comment) {
        this(
                comment.getId(),
                comment.getContent(),
                comment.getParent().getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getUser().getEmail(),
                comment.getCreatedAt(),
                comment.getModifiedAt());
    }
}
