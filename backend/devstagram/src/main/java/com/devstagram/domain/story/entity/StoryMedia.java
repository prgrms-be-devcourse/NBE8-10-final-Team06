package com.devstagram.domain.story.entity;

import com.devstagram.global.enumtype.MediaType;

public class StoryMedia {
    Long id;
    MediaType mediaType; // 이미지, 동영상
    String sourceUrl;
}
