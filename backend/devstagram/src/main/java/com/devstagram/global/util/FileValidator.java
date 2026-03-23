package com.devstagram.global.util;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.exception.ServiceException;

@Component
public class FileValidator {

    private static final List<String> ALLOWED_IMAGE_TYPES =
            Arrays.asList("image/jpeg", "image/png", "image/gif", "image/webp");

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;

    public void validateImage(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            return;
        }

        String contentType = file.getContentType();
        if (contentType == null || !isSupportedContentType(contentType)) {
            throw new ServiceException("400-F-2", "이미지 파일(jpg, png, gif, webp)만 업로드 가능합니다.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ServiceException("400-F-3", "파일 크기는 50MB를 초과할 수 없습니다.");
        }
    }

    private boolean isSupportedContentType(String contentType) {
        return ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase());
    }

    public void validateImages(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;

        if (files.size() > 10) {
            throw new ServiceException("400-F-5", "한 번에 최대 10개의 이미지만 업로드 가능합니다.");
        }

        files.forEach(this::validateImage);
    }
}
