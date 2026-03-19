package com.devstagram.domain.dm.controller;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmSendMessageRequest;
import com.devstagram.domain.dm.dto.TypingEventDto;
import com.devstagram.domain.dm.dto.WebSocketEventPayload;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.global.security.SecurityUtil;

/**
 * DM WebSocket(STOMP) 이벤트 컨트롤러.
 *
 * 클라이언트 송신:
 *  - /app/dm/{roomId}/typing
 *  - /app/dm/{roomId}/read
 *  - /app/dm/{roomId}/join
 *  - /app/dm/{roomId}/leave
 *
 * 서버 브로드캐스트:
 *  - /topic/dm.{roomId}
 *
 * 메시지 형식 (예: typing)
 * {
 *   "type": "typing",
 *   "data": {
 *     "roomId": 1,
 *     "userId": 2,
 *     "status": "start"
 *   }
 * }
 */
@Controller
public class DmWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DmService dmService;
    private final ScheduledExecutorService typingScheduler = Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<String, ScheduledFuture<?>> typingStopTasks = new ConcurrentHashMap<>();
    private static final long TYPING_IDLE_MS = 3000L;

    public DmWebSocketController(SimpMessagingTemplate messagingTemplate, DmService dmService) {
        this.messagingTemplate = messagingTemplate;
        this.dmService = dmService;
    }

    @MessageMapping("/dm/{roomId}/message")
    public void message(@DestinationVariable Long roomId, @Payload DmSendMessageRequest request) {
        // STOMP 인증 연동 시 SecurityContext 에서 유저를 읽는다.
        Long userId = SecurityUtil.getCurrentUserId();

        DmMessageResponse saved = dmService.sendMessage(userId, roomId, request);
        WebSocketEventPayload<DmMessageResponse> payload = new WebSocketEventPayload<>("message", saved);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    @MessageMapping("/dm/{roomId}/typing")
    public void typing(@DestinationVariable Long roomId, @Payload TypingEventDto typingEventDto) {
        Long userId = resolveUserId(typingEventDto.userId());
        String status = typingEventDto.status();

        TypingWsPayload payload = new TypingWsPayload("typing", roomId, userId, status);
        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);

        // 인증이 없는 상태(테스트/특수 케이스)에서는 타이핑 stop 스케줄을 생략한다.
        if (!isAuthenticated() || userId == null) return;

        String key = typingKey(roomId, userId);

        if ("start".equals(status)) {
            cancelTypingStopTask(key);
            ScheduledFuture<?> future = typingScheduler.schedule(
                    () -> {
                        TypingWsPayload stopPayload = new TypingWsPayload("typing", roomId, userId, "stop");
                        messagingTemplate.convertAndSend("/topic/dm." + roomId, stopPayload);
                        typingStopTasks.remove(key);
                    },
                    TYPING_IDLE_MS,
                    TimeUnit.MILLISECONDS);

            typingStopTasks.put(key, future);
        } else if ("stop".equals(status)) {
            cancelTypingStopTask(key);
        }
    }

    public record ReadEventDto(Long roomId, Long userId, Long messageId) {}

    @MessageMapping("/dm/{roomId}/read")
    public void read(@DestinationVariable Long roomId, @Payload ReadEventDto readEventDto) {
        Long userId = SecurityUtil.getCurrentUserId();
        Long messageId = dmService.markRead(userId, roomId, readEventDto.messageId());

        ReadWsPayload payload = new ReadWsPayload("read", messageId);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    public record JoinLeaveEventDto(Long roomId, Long userId) {}

    @MessageMapping("/dm/{roomId}/join")
    public void join(@DestinationVariable Long roomId, @Payload JoinLeaveEventDto dto) {
        JoinLeaveWsPayload payload = new JoinLeaveWsPayload("join", roomId, dto.userId());
        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    @MessageMapping("/dm/{roomId}/leave")
    public void leave(@DestinationVariable Long roomId, @Payload JoinLeaveEventDto dto) {
        Long userId = dto.userId();
        if (userId != null) {
            cancelTypingStopTask(typingKey(roomId, userId));

            // 명세: 웹소켓 종료(나가기) 시 typing stop 전송
            TypingWsPayload stopPayload = new TypingWsPayload("typing", roomId, userId, "stop");
            messagingTemplate.convertAndSend("/topic/dm." + roomId, stopPayload);
        }

        JoinLeaveWsPayload payload = new JoinLeaveWsPayload("leave", roomId, userId);
        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    // ---- WebSocket payloads (명세 형태 우선) ----

    public record TypingWsPayload(String type, Long roomId, Long userId, String status) {}

    public record ReadWsPayload(String type, Long messageId) {}

    public record JoinLeaveWsPayload(String type, Long roomId, Long userId) {}

    private boolean isAuthenticated() {
        try {
            return SecurityUtil.getCurrentUserId() != null;
        } catch (Exception e) {
            return false;
        }
    }

    private Long resolveUserId(Long fallbackUserId) {
        try {
            Long current = SecurityUtil.getCurrentUserId();
            return current != null ? current : fallbackUserId;
        } catch (Exception e) {
            return fallbackUserId;
        }
    }

    private String typingKey(Long roomId, Long userId) {
        return roomId + ":" + userId;
    }

    private void cancelTypingStopTask(String key) {
        ScheduledFuture<?> previous = typingStopTasks.remove(key);
        if (previous != null) {
            previous.cancel(false);
        }
    }
}
