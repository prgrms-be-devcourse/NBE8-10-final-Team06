package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record CommentInfoRes(
        String content,
        long userId,
        String nickname,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt,
        long replyCount) {
    public CommentInfoRes(Comment comment) {
        this(
                comment.getContent(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getCreatedAt(),
                comment.getModifiedAt(),
                comment.getReplyCount());
    }
}
