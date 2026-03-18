package com.devstagram.domain.dm.dto;

import java.util.Date;
import java.util.List;

public record DmRoomSummaryResponse(
        Long roomId,
        String roomName,
        Boolean isGroup,
        DmMessageResponse lastMessage,
        Date joinedAt,
        List<DmRoomParticipantSummary> participants,
        long unreadCount) {}
