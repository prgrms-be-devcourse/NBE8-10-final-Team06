package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.post.entity.Post;

import lombok.Builder;

@Builder
public record PostDetailRes(
        Long id, String title, String content, Long likeCount, Long commentCount, LocalDateTime createdAt

        // TODO: 댓글 슬라이스 추가
        ) {
    public static PostDetailRes from(Post post) {
        return PostDetailRes.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
