package com.devstagram.domain.post.dto;

import java.util.List;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.dto.TechTagRes;

import lombok.Builder;

@Builder
public record PostFeedProfileRes(
        Long id, List<PostMediaRes> medias, List<TechTagRes> techStacks, Long likeCount, Long commentCount) {
    public static PostFeedProfileRes from(Post post) {
        return PostFeedProfileRes.builder()
                .id(post.getId())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .techStacks(post.getTechTags().stream().map(TechTagRes::from).toList())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .build();
    }
}
