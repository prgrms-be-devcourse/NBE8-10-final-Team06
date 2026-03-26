package com.devstagram.domain.comment.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.comment.entity.Comment;

public record CommentInfoRes(
        Long id,
        Long userId,
        String content,
        String nickname,
        boolean isLiked,
        boolean isMine,
        String profileImageUrl,
        LocalDateTime createdAt,
        LocalDateTime modifiedAt,
        long replyCount) {
    public CommentInfoRes(Comment comment, boolean isLiked, Long currentMemberId) {
        this(
                comment.getId(),
                comment.getUser().getId(),
                comment.getContent(),
                comment.getUser().getNickname(),
                isLiked,
                currentMemberId != null && comment.getUser().getId().equals(currentMemberId),
                comment.getUser().getProfileImageUrl(),
                comment.getCreatedAt(),
                comment.getModifiedAt(),
                comment.getReplyCount());
    }
}
