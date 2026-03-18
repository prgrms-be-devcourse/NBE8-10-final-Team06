package com.devstagram.domain.comment.dto;

import com.devstagram.domain.comment.entity.Comment;
import java.time.LocalDateTime;

public record CommentInfoRes(
        long id,
        String content,
        long authorId,
        String nickname,
        String email,
        long postId,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt,
        long replyCount
) {
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
                comment.getReplyCount()
        );
    }
}