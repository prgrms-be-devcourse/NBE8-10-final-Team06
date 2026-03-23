package com.devstagram.global.enumtype;

import com.devstagram.global.exception.ServiceException;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MediaType {
    jpg,
    jpeg,
    gif,
    png,
    webp,
    mp4,
    webm,
    mov;

    public static MediaType fromString(String extension) {
        if (extension == null || extension.isBlank()) {
            return jpg;
        }

        try {
            return MediaType.valueOf(extension.toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new ServiceException("400-S-4", "지원하지 않는 파일 형식입니다: " + extension);
        }
    }
}
