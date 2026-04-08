package com.devstagram.domain.dm.controller;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.messaging.Message;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmSendMessageRequest;
import com.devstagram.domain.dm.dto.TypingEventDto;
import com.devstagram.domain.dm.dto.WebSocketEventPayload;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.global.security.SecurityUser;
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

    /**
     * 클라이언트 → {@code /app/dm/{roomId}/message} 로 들어온 STOMP SEND 를 처리한다.
     *
     * {@code Message<?>} 를 인자로 받는 이유:
     * Spring 의 client inbound channel 은 보통 {@link java.util.concurrent.Executor} 로 메시지를 처리하며,
     * {@link org.springframework.messaging.support.ChannelInterceptor#preSend} 가 돌아가는 스레드와
     * 이 {@code @MessageMapping} 메서드가 실행되는 스레드가 다를 수 있다.
     * {@link com.devstagram.global.security.SecurityUtil#getCurrentUserId()} 는
     * {@link org.springframework.security.core.context.SecurityContextHolder}(스레드 로컬)만 보므로,
     * 인터셉터에서 채운 인증이 핸들러 스레드에 전달되지 않으면 401 이 발생할 수 있다.
     *
     *
     * CONNECT 시 {@code StompHeaderAccessor#setUser} 로 WebSocket 세션에 붙인 {@code Authentication} 은
     * 디스패치되는 {@code Message} 의 헤더/Accessor 를 통해 핸들러까지 따라오므로,
     * {@link org.springframework.messaging.simp.stomp.StompHeaderAccessor#getUser()} 로 본인 userId 를 확정한다.
     *
     */
    @MessageMapping("/dm/{roomId}/message")
    public void message(Message<?> message, @DestinationVariable Long roomId, @Payload DmSendMessageRequest request) {
        Long userId = requireUserIdFromStompOrSecurity(message);
        if (userId == null) {
            return; // 미인증 세션: 저장하지 않고 조용히 무시
        }

        DmMessageResponse saved = dmService.sendMessage(userId, roomId, request);
        WebSocketEventPayload<DmMessageResponse> payload = new WebSocketEventPayload<>("message", saved);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    /**
     * 타이핑 이벤트 송신. 본인 userId 는 STOMP {@code Message} 기준(세션 principal)을 우선하고,
     * 없을 때만 페이로드의 {@code userId} 및 {@link SecurityUtil} 폴백을 사용한다.
     */
    @MessageMapping("/dm/{roomId}/typing")
    public void typing(Message<?> message, @DestinationVariable Long roomId, @Payload TypingEventDto typingEventDto) {
        Long userId = resolveUserId(typingEventDto.userId(), message);
        String status = typingEventDto.status();

        TypingWsPayload payload = new TypingWsPayload("typing", roomId, userId, status);
        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);

        // STOMP 세션 또는 SecurityContext 어느 쪽에도 인증이 없으면(로컬 테스트 등) 지연 stop 스케줄만 생략
        if (!isAuthenticated(message) || userId == null) {
            return;
        }

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

    /** 읽음 처리. {@code message} 에서 세션 principal 로 읽은 사용자만 {@link DmService#markRead} 에 전달한다. */
    @MessageMapping("/dm/{roomId}/read")
    public void read(Message<?> message, @DestinationVariable Long roomId, @Payload ReadEventDto readEventDto) {
        Long userId = requireUserIdFromStompOrSecurity(message);
        if (userId == null) {
            return; // 미인증 세션 무시
        }

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

    /**
     * 타이핑 스케줄 여부 판단용. STOMP 로 확정된 사용자가 있으면 true,
     * 없으면 {@link SecurityUtil} 로만 시도(핸들러 스레드에 컨텍스트가 남아 있는 예외 경로).
     */
    private boolean isAuthenticated(Message<?> message) {
        if (userIdFromStompMessage(message) != null) {
            return true;
        }
        try {
            return SecurityUtil.getCurrentUserId() != null;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 타이핑용: 세션 기반 ID → 없으면 HTTP 와 동일한 SecurityContext → 최종적으로 페이로드 {@code fallbackUserId}.
     */
    private Long resolveUserId(Long fallbackUserId, Message<?> message) {
        Long stomp = userIdFromStompMessage(message);
        if (stomp != null) {
            return stomp;
        }
        try {
            Long current = SecurityUtil.getCurrentUserId();
            return current != null ? current : fallbackUserId;
        } catch (Exception e) {
            return fallbackUserId;
        }
    }

    /**
     * message/read 등 반드시 로그인 사용자여야 하는 핸들러용.
     * 1순위: STOMP {@code Message} 의 {@link StompHeaderAccessor#getUser()}({@code SecurityUser} principal)
     * 2순위: {@link SecurityUtil#getCurrentUserId()} (동일 스레드에 SecurityContext 가 있을 때만 성공)
     *
     * 인증 정보가 전혀 없으면 null 을 반환한다(예외를 던지지 않음).
     * 호출부에서 null 체크 후 조용히 무시해야 한다.
     */
    private Long requireUserIdFromStompOrSecurity(Message<?> message) {
        Long stomp = userIdFromStompMessage(message);
        if (stomp != null) {
            return stomp;
        }
        try {
            return SecurityUtil.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * CONNECT 시 인터셉터가 {@code accessor.setUser(Authentication)} 해 둔 값을,
     * 현재 디스패치 중인 STOMP {@code Message} 에서 꺼낸다. Executor 로 스레드가 바뀌어도 Message 는 같이 넘어온다.
     */
    private static Long userIdFromStompMessage(Message<?> message) {
        if (message == null) {
            return null;
        }
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return null;
        }
        Object principal = accessor.getUser();
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof SecurityUser su) {
            return su.getId();
        }
        return null;
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
