package com.devstagram.domain.story.dto;

import java.util.List;

import com.devstagram.global.enumtype.MediaType;

import lombok.Builder;

@Builder
public record StoryCreateRequest(
        String content, List<Long> tagUserIds, MediaType mediaType, String storageSource, String thumbnailUrl) {}
