package com.devstagram.domain.dm.dto;

public record TypingEventDto(Long roomId, Long userId, String status // "start" | "stop"
        ) {}
