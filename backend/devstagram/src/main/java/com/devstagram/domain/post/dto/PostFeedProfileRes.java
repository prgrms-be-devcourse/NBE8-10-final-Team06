package com.devstagram.domain.post.dto;

import java.util.List;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.dto.TechTagRes;

import lombok.Builder;

@Builder
public record PostFeedProfileRes(
        Long id,
        String title, // 사진 없는 게시물의 경우, 프로필 페이지에서 제목으로 구분 가능하도록
        List<PostMediaRes> medias,
        List<TechTagRes> techStacks,
        Long likeCount,
        Long commentCount) {
    public static PostFeedProfileRes from(Post post) {
        return PostFeedProfileRes.builder()
                .id(post.getId())
                .title(post.getTitle())
                .medias(post.getMediaList().stream().map(PostMediaRes::from).toList())
                .techStacks(post.getTechTags().stream().map(TechTagRes::from).toList())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .build();
    }
}
