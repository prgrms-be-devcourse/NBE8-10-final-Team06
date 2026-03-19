package com.devstagram.global.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * 파일 저장소 인터페이스
 * 추후 S3나 Redis 기반 저장소로 교체하기 위해 추상화함
 */
public interface StorageService {

    /**
     * 파일을 저장하고 저장된 파일명을 반환함
     * @param file 업로드할 미디어 파일
     * @return 저장된 고유 파일명 (UUID 기반)
     */
    String store(MultipartFile file);

    /**
     * 실제 물리 파일을 삭제함
     * @param fileName 삭제할 파일명 혹은 경로
     */
    void delete(String fileName);
}
