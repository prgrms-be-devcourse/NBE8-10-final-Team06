package com.devstagram.domain.dm.controller;

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
        WebSocketEventPayload<TypingEventDto> payload = new WebSocketEventPayload<>("typing", typingEventDto);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    public record ReadEventDto(Long roomId, Long userId, Long messageId) {}

    @MessageMapping("/dm/{roomId}/read")
    public void read(@DestinationVariable Long roomId, @Payload ReadEventDto readEventDto) {
        WebSocketEventPayload<ReadEventDto> payload = new WebSocketEventPayload<>("read", readEventDto);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    public record JoinLeaveEventDto(Long roomId, Long userId) {}

    @MessageMapping("/dm/{roomId}/join")
    public void join(@DestinationVariable Long roomId, @Payload JoinLeaveEventDto dto) {
        WebSocketEventPayload<JoinLeaveEventDto> payload = new WebSocketEventPayload<>("join", dto);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }

    @MessageMapping("/dm/{roomId}/leave")
    public void leave(@DestinationVariable Long roomId, @Payload JoinLeaveEventDto dto) {
        WebSocketEventPayload<JoinLeaveEventDto> payload = new WebSocketEventPayload<>("leave", dto);

        messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
    }
}
