package com.devstagram.domain.post.entity;

import com.devstagram.global.entity.BaseEntity;
import com.devstagram.global.enumtype.MediaType;

public class PostMedia extends BaseEntity {
    short sequence;

    MediaType mediaType;

    String sourceUrl;
}
