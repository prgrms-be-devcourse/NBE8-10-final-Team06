package com.devstagram.domain.dm.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
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

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 실시간 채팅과 동일하게 CONNECT 시 세션에 붙은 principal 이 SEND {@link Message} 헤더로 전달되는 경우.
     * {@link SecurityContextHolder} 는 비워 두어도 {@link StompHeaderAccessor#getUser()} 로 userId 를 확정한다.
     */
    private static Message<byte[]> stompSendMessageWithUser(SecurityUser securityUser) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                securityUser, securityUser.getPassword(), securityUser.getAuthorities());
        accessor.setUser(auth);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void message_savesAndBroadcasts_resolvingUserFromStompMessage() {
        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));

        DmSendMessageRequest req = new DmSendMessageRequest(MessageType.TEXT, "hello", null);
        DmMessageResponse saved =
                new DmMessageResponse(10L, MessageType.TEXT, "hello", null, true, "2026-04-09T07:13:39+09:00", 1L);
        when(dmService.sendMessage(1L, 1L, req)).thenReturn(saved);

        controller.message(stompSendMessageWithUser(securityUser), 1L, req);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("message", saved));
    }

    /**
     * STOMP {@code Message} 가 없거나 accessor 에 user 가 없을 때 폴백(레거시·동일 스레드 컨텍스트).
     */
    @Test
    void message_savesAndBroadcasts_fallsBackToSecurityContextWhenNoStompUser() {
        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        securityUser, securityUser.getPassword(), securityUser.getAuthorities()));

        DmSendMessageRequest req = new DmSendMessageRequest(MessageType.TEXT, "hello", null);
        DmMessageResponse saved =
                new DmMessageResponse(10L, MessageType.TEXT, "hello", null, true, "2026-04-09T07:13:39+09:00", 1L);
        when(dmService.sendMessage(1L, 1L, req)).thenReturn(saved);

        controller.message(null, 1L, req);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new WebSocketEventPayload<>("message", saved));
    }

    @Test
    void typing_broadcastsToRoomTopic_withoutSchedulingWhenNotAuthenticated() {
        TypingEventDto dto = new TypingEventDto(1L, 2L, "start");

        controller.typing(null, 1L, dto);

        verify(messagingTemplate)
                .convertAndSend("/topic/dm.1", new DmWebSocketController.TypingWsPayload("typing", 1L, 2L, "start"));
    }

    @Test
    void read_broadcastsToRoomTopic_resolvingUserFromStompMessage() {
        DmWebSocketController.ReadEventDto dto = new DmWebSocketController.ReadEventDto(1L, 2L, 123L);

        SecurityUser securityUser = new SecurityUser(
                2L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        when(dmService.markRead(2L, 1L, 123L)).thenReturn(123L);

        controller.read(stompSendMessageWithUser(securityUser), 1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new DmWebSocketController.ReadWsPayload("read", 123L));
    }

    @Test
    void read_broadcastsToRoomTopic_fallsBackToSecurityContextWhenNoStompUser() {
        DmWebSocketController.ReadEventDto dto = new DmWebSocketController.ReadEventDto(1L, 2L, 123L);

        SecurityUser securityUser = new SecurityUser(
                2L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        securityUser, securityUser.getPassword(), securityUser.getAuthorities()));

        when(dmService.markRead(2L, 1L, 123L)).thenReturn(123L);

        controller.read(null, 1L, dto);

        verify(messagingTemplate).convertAndSend("/topic/dm.1", new DmWebSocketController.ReadWsPayload("read", 123L));
    }

    @Test
    void join_broadcastsToRoomTopic() {
        DmWebSocketController.JoinLeaveEventDto dto = new DmWebSocketController.JoinLeaveEventDto(1L, 2L);

        controller.join(1L, dto);

        verify(messagingTemplate)
                .convertAndSend("/topic/dm.1", new DmWebSocketController.JoinLeaveWsPayload("join", 1L, 2L));
    }

    @Test
    void leave_broadcastsToRoomTopic() {
        DmWebSocketController.JoinLeaveEventDto dto = new DmWebSocketController.JoinLeaveEventDto(1L, 2L);

        controller.leave(1L, dto);

        verify(messagingTemplate)
                .convertAndSend("/topic/dm.1", new DmWebSocketController.TypingWsPayload("typing", 1L, 2L, "stop"));
        verify(messagingTemplate)
                .convertAndSend("/topic/dm.1", new DmWebSocketController.JoinLeaveWsPayload("leave", 1L, 2L));
    }
}
