package com.devstagram.domain.story.dto;

import java.util.List;

import com.devstagram.global.enumtype.MediaType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class StoryCreateRequest {
    private String content;
    private List<Long> tagUserIds;
    private MediaType mediaType;
    private String storageSource;
    private String thumbnailUrl;
}
