package com.devstagram.domain.dm.dto;

public record DmRoomParticipantSummary(
        Long userId,
        String email,
        String nickname, // DM 목록에서 상대방 정보 표시 위해 추가
        String profileImageUrl // DM 목록에서 DM 목록에서 상대방 정보 표시 위해 추가
        ) {}
