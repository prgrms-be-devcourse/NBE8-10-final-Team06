package com.devstagram.domain.dm.dto;

import com.devstagram.domain.dm.entity.MessageType;

public record DmSendMessageRequest(MessageType type, String content, String thumbnail) {}
