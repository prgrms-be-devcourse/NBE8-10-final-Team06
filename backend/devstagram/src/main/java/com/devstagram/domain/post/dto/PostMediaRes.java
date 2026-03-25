package com.devstagram.domain.post.dto;

import com.devstagram.domain.post.entity.PostMedia;
import com.devstagram.global.enumtype.MediaType;

public record PostMediaRes(Long id, String sourceUrl, short sequence, MediaType mediaType) {
    public static PostMediaRes from(PostMedia media) {
        return new PostMediaRes(media.getId(), media.getSourceUrl(), media.getSequence(), media.getMediaType());
    }
}
