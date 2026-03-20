package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record CommentInfoRes(
        Long id,
        Long userId,
        String content,
        String nickname,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt,
        long replyCount) {
    public CommentInfoRes(Comment comment) {
        this(
                comment.getId(),
                comment.getUser().getId(),
                comment.getContent(),
                comment.getUser().getNickname(),
                comment.getCreatedAt(),
                comment.getModifiedAt(),
                comment.getReplyCount());
    }
}
