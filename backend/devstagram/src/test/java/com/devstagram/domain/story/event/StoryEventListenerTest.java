package com.devstagram.domain.story.event;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.devstagram.domain.dm.service.DmService;
import com.devstagram.domain.story.dto.StoryCreatedEvent;
import com.devstagram.domain.story.entity.Story;

@ExtendWith(MockitoExtension.class)
class StoryEventListenerTest {

    @Mock
    private DmService dmService;

    @InjectMocks
    private StoryEventListener storyEventListener;

    @Test
    @DisplayName("태그된 사용자 알림 DM 전송 성공 확인")
    void notifyTaggedUsers_Success() {
        // given
        Story story = mock(Story.class);
        given(story.getThumbnailUrl()).willReturn("thumb.jpg");
        List<Long> taggedUserIds = List.of(2L, 3L);
        Long creatorId = 1L;
        StoryCreatedEvent event = new StoryCreatedEvent(story, taggedUserIds, creatorId);

        given(dmService.getOrCreate1v1RoomId(eq(creatorId), anyLong())).willReturn(10L);

        // when
        storyEventListener.notifyTaggedUsers(event);

        // then
        verify(dmService, times(2)).getOrCreate1v1RoomId(eq(creatorId), anyLong());
        verify(dmService, times(2)).sendMessage(eq(creatorId), eq(10L), any());
    }

    @Test
    @DisplayName("태그된 사용자 없을 때 아무것도 하지 않음")
    void notifyTaggedUsers_NoTaggedUsers() {
        // given
        Story story = mock(Story.class);
        StoryCreatedEvent event = new StoryCreatedEvent(story, List.of(), 1L);

        // when
        storyEventListener.notifyTaggedUsers(event);

        // then
        verifyNoInteractions(dmService);
    }
}
