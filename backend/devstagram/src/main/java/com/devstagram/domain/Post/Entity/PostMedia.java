package com.devstagram.domain.Post.Entity;

import com.devstagram.global.Entity.BaseEntity;
import com.devstagram.global.Enum.MediaType;

public class PostMedia extends BaseEntity {
    short sequence; // 미디어 순서

    MediaType mediaType;

    String sourceUrl;
}
