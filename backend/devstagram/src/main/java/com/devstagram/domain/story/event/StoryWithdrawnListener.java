package com.devstagram.domain.story.event;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.story.service.StoryService;
import com.devstagram.domain.user.event.UserWithdrawnEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class StoryWithdrawnListener {

    private final StoryService storyService;

    @EventListener
    @Transactional
    public void handleUserWithdrawn(UserWithdrawnEvent event) {
        Long userId = event.getUserId();
        log.info("스토리 리스너 작동: 유저 {}의 스토리를 삭제합니다.", userId);

        storyService.deleteAllStoriesByUserId(userId);

        log.info("유저 {}의 스토리 삭제 완료", userId);
    }
}
