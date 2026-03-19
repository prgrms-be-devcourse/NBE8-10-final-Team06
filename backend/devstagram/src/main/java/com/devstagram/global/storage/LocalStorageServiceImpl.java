package com.devstagram.global.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.exception.ServiceException;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class LocalStorageServiceImpl implements StorageService {

    // application.yml 파일에 적어둔 저장 경로를 빼옴
    @Value("${storage.location}")
    private String uploadPath;

    // 폴더 경로 객체
    private Path rootLocation;

    @PostConstruct // 파일 저장될 폴더 세팅
    public void init() {
        try {
            // "C:/uploads" 같은 문자열을 자바가 이해할 수 있는 Path 객체로 변환
            this.rootLocation = Paths.get(uploadPath);

            // 해당 경로에 폴더가 없으면 새로 생성, 있으면 넘어감)
            Files.createDirectories(rootLocation);

            log.info("파일 저장 경로 준비 완료: {}", rootLocation.toAbsolutePath());
        } catch (IOException e) {
            throw new ServiceException("500-S-1", "저장소 디렉토리 생성 불가");
        }
    }

    // 넘겨준 MultipartFile 받아서 하드디스크에 저장
    @Override
    public String store(MultipartFile file) {
        // 빈 파일이 넘어왔는지 1차로 걸러냄
        if (file.isEmpty()) {
            throw new ServiceException("400-S-1", "빈 파일 업로드 불가");
        }

        try {
            // 파일의 원래 이름/확장자 파악
            String originalFilename = file.getOriginalFilename();

            // . 기준으로 확장자만 분리 -> 파일명 : 난수 + 확장자로 설정해서 동일 파일 덮어쓰기 방지
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String savedFilename = UUID.randomUUID().toString() + extension;

            if (savedFilename.contains("..")) {
                throw new ServiceException("400-S-2", "파일명에 부적절한 문자가 포함");
            }

            Files.copy(file.getInputStream(), this.rootLocation.resolve(savedFilename));

            return savedFilename; // 저장 성공 -> 저장한 파일명 반환

        } catch (IOException e) {
            throw new ServiceException("500-S-2", "파일을 하드디스크에 기록하는 중 오류가 발생.");
        }
    }

    // 파일 삭제
    @Override
    public void delete(String fileName) {
        try {
            Path file = rootLocation.resolve(fileName); // 온전한 전체 경로를 조립

            Files.deleteIfExists(file); // 있으면 지우고, 없으면 그냥 넘어감

        } catch (IOException e) {
            log.error("파일 물리 삭제 실패 : {}", fileName, e);
        }
    }
}
