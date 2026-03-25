package com.devstagram.global.config;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean(name = "feedTaskExecutor")
    public Executor feedTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);      // 기본 스레드 수
        executor.setMaxPoolSize(16);     // 최대 스레드 수
        executor.setQueueCapacity(500);  // 대기 큐
        executor.setThreadNamePrefix("FeedAsync-");
        executor.initialize();
        return executor;
    }
}