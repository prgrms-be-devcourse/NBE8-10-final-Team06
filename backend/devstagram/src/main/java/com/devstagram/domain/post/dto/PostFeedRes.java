package com.devstagram.domain.post.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.dto.TechTagRes;

import lombok.Builder;

@Builder
public record PostFeedRes(
        Long id,
        Long authorId,
        String nickname,
        String title,
        String content,
        List<PostMediaRes> medias,
        List<TechTagRes> techStacks,
        boolean isLiked,
        boolean isScrapped,
        boolean isMine,
        double feedScore,
        String profileImageUrl,
        Long likeCount,
        Long commentCount,
        LocalDateTime createdAt) {
    public static PostFeedRes from(Post post, boolean isLiked, boolean isScrapped, Long currentMemberId, double score) {
        return PostFeedRes.builder()
                .id(post.getId())
                .authorId(post.getUser().getId())
                .nickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .techStacks(post.getTechTags().stream().map(TechTagRes::from).toList())
                .isLiked(isLiked)
                .isScrapped(isScrapped)
                .isMine(currentMemberId != null && post.getUser().getId().equals(currentMemberId))
                .feedScore(score)
                .profileImageUrl(post.getUser().getProfileImageUrl())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
