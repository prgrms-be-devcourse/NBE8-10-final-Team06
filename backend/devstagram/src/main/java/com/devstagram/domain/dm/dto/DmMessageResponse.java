package com.devstagram.domain.dm.dto;

import java.time.LocalDateTime;

import com.devstagram.domain.dm.entity.MessageType;

public record DmMessageResponse(
        Long id, MessageType type, String content, String thumbnail, boolean valid, LocalDateTime createdAt) {}
