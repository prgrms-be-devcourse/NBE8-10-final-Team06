package com.devstagram.domain.post.dto;

import java.util.Date;

import com.devstagram.domain.post.entity.Post;

import lombok.Builder;

@Builder
public record PostFeedRes(Long id, String title, String content, Long likeCount, Long commentCount, Date createdAt) {
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
