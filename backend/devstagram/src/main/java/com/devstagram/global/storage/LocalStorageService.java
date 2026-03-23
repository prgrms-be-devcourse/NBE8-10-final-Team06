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

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("비어있는 파일은 저장할 수 없습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        String savedFileName = createSavedFileName(originalFilename);

        try {
            File destination = new File(uploadDir, savedFileName);
            file.transferTo(destination);

            log.info("파일 저장 성공: {} -> {}", originalFilename, savedFileName);

            return savedFileName;
        } catch (IOException e) {
            log.error("파일 저장 중 오류 발생", e);
            throw new RuntimeException("서버 내부 오류로 파일을 저장하지 못했습니다.", e);
        }
    }

    @Override
    public void delete(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName);

            boolean deleted = Files.deleteIfExists(filePath);

            if (deleted) {
                log.info("파일 삭제 성공: {}", fileName);
            } else {
                log.warn("삭제할 파일이 존재하지 않음: {}", fileName);
            }
        } catch (IOException e) {
            log.error("파일 삭제 중 기술적 오류 발생: {}", fileName, e);

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
