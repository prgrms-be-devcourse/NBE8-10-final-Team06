package com.devstagram.global.enumtype;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MediaType {
    JPG,
    JPEG,
    GIF,
    PNG,
    WEBP,
    MP4,
    WEBM,
    MOV;

    public static MediaType fromString(String extension) {
        try {
            return MediaType.valueOf(extension.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            return JPG;
        }
    }
}
