package com.devstagram.domain.dm.controller;

import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devstagram.domain.dm.dto.TypingEventDto;
import com.devstagram.domain.dm.dto.WebSocketEventPayload;

@ExtendWith(MockitoExtension.class)
class DmWebSocketControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private DmWebSocketController controller;

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
