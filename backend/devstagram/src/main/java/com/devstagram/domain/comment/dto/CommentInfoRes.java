package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record CommentInfoRes(
        long id,
        String content,
        long authorId,
        String nickname,
        String email,
        long postId,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt,
        long replyCount) {
    public CommentInfoRes(Comment comment) {
        this(
                comment.getId(),
                comment.getContent(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getUser().getEmail(),
                comment.getPost().getId(),
                comment.getCreatedAt(),
                comment.getModifiedAt(),
                comment.getReplyCount());
    }
}
