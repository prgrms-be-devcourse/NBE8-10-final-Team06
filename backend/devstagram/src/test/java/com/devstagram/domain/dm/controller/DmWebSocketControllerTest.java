package com.devstagram.domain.dm.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmSendMessageRequest;
import com.devstagram.domain.dm.dto.TypingEventDto;
import com.devstagram.domain.dm.dto.WebSocketEventPayload;
import com.devstagram.domain.dm.entity.MessageType;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.global.security.SecurityUser;

@ExtendWith(MockitoExtension.class)
class DmWebSocketControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private DmService dmService;

    @InjectMocks
    private DmWebSocketController controller;

    @Test
    void message_savesAndBroadcastsToRoomTopic() {
        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));

        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        securityUser, securityUser.getPassword(), securityUser.getAuthorities()));

        DmSendMessageRequest req = new DmSendMessageRequest(MessageType.TEXT, "hello", null);
        DmMessageResponse saved =
                new DmMessageResponse(10L, MessageType.TEXT, "hello", null, true, LocalDateTime.now());
        when(dmService.sendMessage(1L, 1L, req)).thenReturn(saved);

        controller.message(1L, req);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("message", saved));
        SecurityContextHolder.clearContext();
    }

    @Test
    void typing_broadcastsToRoomTopic() {
        TypingEventDto dto = new TypingEventDto(1L, 2L, "start");

        controller.typing(1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("typing", dto));
    }

    @Test
    void read_broadcastsToRoomTopic() {
        DmWebSocketController.ReadEventDto dto = new DmWebSocketController.ReadEventDto(1L, 2L, 123L);

        controller.read(1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("read", dto));
    }

    @Test
    void join_broadcastsToRoomTopic() {
        DmWebSocketController.JoinLeaveEventDto dto = new DmWebSocketController.JoinLeaveEventDto(1L, 2L);

        controller.join(1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("join", dto));
    }

    @Test
    void leave_broadcastsToRoomTopic() {
        DmWebSocketController.JoinLeaveEventDto dto = new DmWebSocketController.JoinLeaveEventDto(1L, 2L);

        controller.leave(1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("leave", dto));
    }
}
