package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.devstagram.domain.post.entity.Post;

import lombok.Builder;

@Builder
public record PostFeedRes(
        Long id,
        Long authorId,
        String nickname,
        String title,
        String content,
        List<PostMediaRes> medias,
        Long likeCount,
        Long commentCount,
        LocalDateTime createdAt) {
    public static PostFeedRes from(Post post) {
        return PostFeedRes.builder()
                .id(post.getId())
                .authorId(post.getUser().getId())
                .nickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
