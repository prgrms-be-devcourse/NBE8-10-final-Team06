package com.devstagram.global.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class LocalStorageService implements StorageService {

    // application.yml에 설정한 경로를 가져옵니다. (ex: /Users/username/uploads/)
    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("비어있는 파일은 저장할 수 없습니다.");
        }

        // 1. 고유한 파일명 생성 (예: abc123-def456_myphoto.jpg)
        String originalFilename = file.getOriginalFilename();
        String savedFileName = createSavedFileName(originalFilename);

        try {
            // 2. 물리적 디렉토리에 파일 저장
            // File 객체는 '파일의 경로'를 나타냅니다.
            File destination = new File(uploadDir, savedFileName);
            // MultipartFile의 데이터를 실제 하드디스크로 옮깁니다.
            file.transferTo(destination);

            log.info("파일 저장 성공: {} -> {}", originalFilename, savedFileName);

            // 3. DB에 저장할 '파일명'을 반환합니다.
            return savedFileName;
        } catch (IOException e) {
            log.error("파일 저장 중 오류 발생", e);
            throw new RuntimeException("서버 내부 오류로 파일을 저장하지 못했습니다.", e);
        }
    }

    @Override
    public void delete(String fileName) {
        // 저장된 파일명을 가지고 전체 경로를 찾아 파일을 삭제합니다.
        File file = new File(uploadDir + fileName);
        if (file.exists()) {
            if (file.delete()) {
                log.info("파일 삭제 완료: {}", fileName);
            } else {
                log.warn("파일 삭제 실패: {}", fileName);
            }
        }
    }

    /**
     * UUID를 활용해 중복되지 않는 파일명을 만듭니다.
     */
    private String createSavedFileName(String originalFilename) {
        String uuid = UUID.randomUUID().toString();
        return uuid + "_" + originalFilename;
    }
}