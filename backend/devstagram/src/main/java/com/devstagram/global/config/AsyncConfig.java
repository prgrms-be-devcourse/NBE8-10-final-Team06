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

        // Core 수
        executor.setCorePoolSize(4);

        // Max 수
        executor.setMaxPoolSize(8);

        // Queue
        executor.setQueueCapacity(100);

        // 거절 정책: 큐가 꽉 찼을 때 요청을 버리지 않고 호출한 스레드(Tomcat)에서 처리하게 함
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());

        executor.setThreadNamePrefix("FeedAsync-");
        executor.initialize();
        return executor;
    }
}
