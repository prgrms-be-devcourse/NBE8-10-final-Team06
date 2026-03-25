package com.devstagram.domain.story.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.devstagram.domain.story.repository.StoryRepository;

@ExtendWith(MockitoExtension.class)
class StorySchedulerTest {

    @Mock
    private StoryRepository storyRepository;

    @InjectMocks
    private StoryScheduler storyScheduler;

    @Test
    @DisplayName("만료된 스토리 체크 및 삭제 호출 확인")
    void checkExpiredStories_CallSuccess() {
        // when
        storyScheduler.checkExpiredStories();

        // then
        verify(storyRepository).softDeleteAllExpiredStories(any());
    }
}
