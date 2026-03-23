package com.devstagram.global.util;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.exception.ServiceException;

@Component // 스프링 빈 등록 필수
public class FileValidator {

    // yml 설정과 맞추거나, 기본값을 지정합니다.
    private static final List<String> ALLOWED_IMAGE_TYPES =
            Arrays.asList("image/jpeg", "image/png", "image/gif", "image/webp");

    // 단일 파일 최대 크기 (10MB)
    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;

    public void validateImage(MultipartFile file) {
        // 1. 파일 존재 여부 체크
        if (file == null || file.isEmpty()) {
            // 파일을 선택하지 않고 요청을 보낼 경우를 대비한 방어 로직
            return;
        }

        // 2. 파일 확장자(MIME Type) 체크
        String contentType = file.getContentType();
        if (contentType == null || !isSupportedContentType(contentType)) {
            throw new ServiceException("400-F-2", "이미지 파일(jpg, png, gif, webp)만 업로드 가능합니다.");
        }

        // 3. 파일 용량 체크
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ServiceException("400-F-3", "파일 크기는 10MB를 초과할 수 없습니다.");
        }
    }

    private boolean isSupportedContentType(String contentType) {
        return ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase());
    }

    public void validateImages(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;

        // 4. 전체 파일 개수 제한 (선택 사항)
        if (files.size() > 10) {
            throw new ServiceException("400-F-5", "한 번에 최대 10개의 이미지만 업로드 가능합니다.");
        }

        files.forEach(this::validateImage);
    }
}
