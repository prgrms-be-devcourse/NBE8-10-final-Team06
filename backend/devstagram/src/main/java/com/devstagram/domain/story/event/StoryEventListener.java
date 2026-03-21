package com.devstagram.domain.story.event;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.dm.dto.DmSendMessageRequest;
import com.devstagram.domain.dm.entity.MessageType;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.domain.story.dto.StoryCreatedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 스토리 생성 이벤트 리스너
@Component
@RequiredArgsConstructor
@Slf4j
public class StoryEventListener {

    private final DmService dmService;

    // 태그된 사용자들에게 DM 알림 전송
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyTaggedUsers(StoryCreatedEvent event) {
        if (event.taggedUserIds() == null || event.taggedUserIds().isEmpty()) {
            return;
        }

        for (Long targetUserId : event.taggedUserIds()) {
            try {
                // 태그된 사용자와의 1:1 방 확보
                Long roomId = dmService.getOrCreate1v1RoomId(event.creatorId(), targetUserId);

                String message = "스토리에서 회원님을 언급했습니다";
                DmSendMessageRequest dmRequest = new DmSendMessageRequest(
                        MessageType.TEXT, message, event.story().getThumbnailUrl());

                // DM 전송
                dmService.sendMessage(event.creatorId(), roomId, dmRequest);
            } catch (Exception e) {
                log.error("태그된 유저 알림 전송 실패");
            }
        }
    }
}
