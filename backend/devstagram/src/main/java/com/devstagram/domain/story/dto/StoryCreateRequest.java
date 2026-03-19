package com.devstagram.domain.story.dto;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.enumtype.MediaType;

import lombok.Builder;

@Builder
public record StoryCreateRequest(
        String content, List<Long> tagUserIds, MediaType mediaType, MultipartFile file, String thumbnailUrl) {}
