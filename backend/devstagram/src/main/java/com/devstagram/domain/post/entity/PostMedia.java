package com.devstagram.domain.post.entity;

import com.devstagram.global.entity.BaseEntity;
import com.devstagram.global.enumtype.MediaType;

public class PostMedia extends BaseEntity {
    short sequence; // 미디어 순서

    MediaType mediaType;

    String sourceUrl;
}
