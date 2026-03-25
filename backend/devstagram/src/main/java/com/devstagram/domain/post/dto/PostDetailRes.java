package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Slice;

import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.dto.TechTagRes;

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
        boolean isLiked,
        boolean isMine,
        String profileImageUrl,
        LocalDateTime createdAt,
        List<PostMediaRes> medias,
        List<TechTagRes> techStacks,
        Slice<CommentInfoRes> comments) {
    public static PostDetailRes from(Post post, Slice<CommentInfoRes> comments, boolean isLiked, Long currentMemberId) {
        return PostDetailRes.builder()
                .id(post.getId())
                .authorId(post.getUser().getId())
                .nickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .isLiked(isLiked)
                .isMine(currentMemberId != null && post.getUser().getId().equals(currentMemberId))
                .profileImageUrl(post.getUser().getProfileImageUrl())
                .createdAt(post.getCreatedAt())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .techStacks(post.getTechTags().stream().map(TechTagRes::from).toList())
                .comments(comments)
                .build();
    }
}
