package com.devstagram.global.storage;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.exception.ServiceException;

import lombok.extern.slf4j.Slf4j;

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
        try {
            // Paths.resolve를 사용하면 'D:/uploads' + 'test.jpg'를 안전하게 결합합니다.
            Path filePath = Paths.get(uploadDir).resolve(fileName);

            // 파일이 존재할 때만 삭제 시도
            boolean deleted = Files.deleteIfExists(filePath);

            if (deleted) {
                log.info("파일 삭제 성공: {}", fileName);
            } else {
                log.warn("삭제할 파일이 존재하지 않음: {}", fileName);
            }
        } catch (IOException e) {
            log.error("파일 삭제 중 기술적 오류 발생: {}", fileName, e);
            // 깃 이슈 4번: Custom Exception Handling 적용
            // 삭제 실패 시 서비스 로직에 전파하여 정합성을 체크하게 함
            throw new ServiceException("500-F-2", "서버 파일 삭제 중 오류가 발생했습니다.");
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
