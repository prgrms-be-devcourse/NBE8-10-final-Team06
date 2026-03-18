package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.post.entity.Post;

import lombok.Builder;

@Builder
public record PostFeedRes(
        Long id, String title, String content, Long likeCount, Long commentCount, LocalDateTime createdAt) {
    public static PostFeedRes from(Post post) {
        return PostFeedRes.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
