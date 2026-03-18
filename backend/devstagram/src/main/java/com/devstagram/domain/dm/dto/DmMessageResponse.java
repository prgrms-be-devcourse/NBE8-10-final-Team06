package com.devstagram.domain.dm.dto;

import java.util.Date;

import com.devstagram.domain.dm.entity.MessageType;

public record DmMessageResponse(
        Long id, MessageType type, String content, String thumbnail, boolean valid, Date createdAt) {}
