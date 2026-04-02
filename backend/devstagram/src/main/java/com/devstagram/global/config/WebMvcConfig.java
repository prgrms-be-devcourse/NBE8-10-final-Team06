package com.devstagram.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile("!prod")
public class WebMvcConfig implements WebMvcConfigurer {

    // application.yml에 적어둔 로컬 저장 경로
    @Value("${storage.location}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // 브라우저에서 접근할 URL 패턴 지정
        registry.addResourceHandler("/temp/media/**")
                //  파일이 저장된 서버의 물리 경로를 연결
                .addResourceLocations("file:" + uploadPath + "/");
    }
}
