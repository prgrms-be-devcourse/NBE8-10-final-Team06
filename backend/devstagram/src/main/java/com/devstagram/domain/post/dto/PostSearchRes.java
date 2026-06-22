package com.devstagram.domain.post.dto;

import com.devstagram.domain.post.entity.PostDocument;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PostSearchRes(
        Long id,
        String title,
        String content,
        List<String> tags,
        LocalDate createdAt,
        int likeCount
) {
    public static PostSearchRes from(PostDocument doc) {
        return new PostSearchRes(
                doc.getId(),
                doc.getTitle(),
                doc.getContent(),
                doc.getTags(),
                doc.getCreatedAt(),
                doc.getLikeCount()
        );
    }
}