package com.devstagram.domain.story.scheduler;

import java.time.LocalDateTime;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.story.repository.StoryRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class StoryScheduler {
    private final StoryRepository storyRepository;

    // 1분마다 만료된 스토리 소프트 삭제 시켜주는 스케졸러
    @Transactional
    @Scheduled(cron = "0 * * * * *") // 매 분 0초에 실행
    public void checkExpiredStories() {
        LocalDateTime now = LocalDateTime.now();

        storyRepository.softDeleteAllExpiredStories(now);
    }
}
