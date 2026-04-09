package com.devstagram.domain.dm.dto;

import com.devstagram.domain.dm.entity.MessageType;

public record DmMessageResponse(
        Long id,
        MessageType type,
        String content,
        String thumbnail,
        boolean valid,
        String createdAt,
        Long senderId // 메시지 로드 시 나/상대방 구분을 위해 추가
        ) {}
