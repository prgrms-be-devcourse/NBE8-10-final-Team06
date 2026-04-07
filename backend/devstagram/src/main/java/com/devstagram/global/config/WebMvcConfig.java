package com.devstagram.global.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile("!prod")
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${storage.location}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 상대 경로를 절대 경로로 변환하여 IDE/실행 환경에 무관하게 동작
        Path absolutePath = Paths.get(uploadPath).toAbsolutePath();

        registry.addResourceHandler("/temp/media/**")
                .addResourceLocations("file:" + absolutePath + "/");
    }
}
