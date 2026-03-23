package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Slice;

import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.post.entity.Post;

import lombok.Builder;

@Builder
public record PostDetailRes(
        Long id,
        Long authorId,
        String nickname,
        String title,
        String content,
        Long likeCount,
        Long commentCount,
        LocalDateTime createdAt,
        List<PostMediaRes> medias,
        Slice<CommentInfoRes> comments) {
    public static PostDetailRes from(Post post, Slice<CommentInfoRes> comments) {
        return PostDetailRes.builder()
                .id(post.getId())
                .authorId(post.getUser().getId())
                .nickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .comments(comments)
                .build();
    }
}
