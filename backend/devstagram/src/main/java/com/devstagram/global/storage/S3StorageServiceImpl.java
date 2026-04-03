package com.devstagram.global.storage;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.global.exception.ServiceException;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Slf4j
@Service
@Profile({"prod", "!test"})
public class S3StorageServiceImpl implements StorageService {

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    private S3Client s3Client;

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".gif", ".png", ".webp", ".webm");

    @PostConstruct
    public void init() {
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
        log.info("S3 클라이언트 초기화 완료 (bucket: {}, region: {})", bucket, region);
    }

    @PreDestroy
    public void destroy() {
        if (s3Client != null) {
            s3Client.close();
        }
    }

    @Override
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ServiceException("400-S-1", "빈 파일 업로드 불가");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.contains("..")) {
            throw new ServiceException("400-S-2", "파일명에 부적절한 문자가 포함");
        }
        if (!originalFilename.contains(".")) {
            throw new ServiceException("400-S-3", "확장자가 없는 파일");
        }

        String extension =
                originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            log.warn("허용되지 않은 파일 업로드 시도: {}", originalFilename);
            throw new ServiceException("400-S-4", "허용되지 않는 파일 형식");
        }

        String key = UUID.randomUUID() + extension;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("S3 파일 업로드 완료: {}", key);
        } catch (IOException e) {
            throw new ServiceException("500-S-2", "파일 저장 중 오류 발생");
        }

        return buildPublicUrl(key);
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return;
        }

        String key = extractKey(fileUrl);

        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            log.info("S3 파일 삭제 완료: {}", key);
        } catch (Exception e) {
            log.error("S3 파일 삭제 실패: {}", fileUrl, e);
        }
    }

    private String buildPublicUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }

    private String extractKey(String fileUrl) {
        try {
            // S3 URL (https://bucket.s3.region.amazonaws.com/key) 에서 key만 추출
            URI uri = URI.create(fileUrl);
            String path = uri.getPath();
            return path.startsWith("/") ? path.substring(1) : path;
        } catch (Exception e) {
            // URL이 아닌 경우(기존 로컬 파일명) 그대로 사용
            return fileUrl;
        }
    }
}
