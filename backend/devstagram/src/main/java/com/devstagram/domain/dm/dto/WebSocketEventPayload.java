package com.devstagram.domain.dm.dto;

/**
 * WebSocket 공통 메시지 래퍼.
 *
 * type:
 *  - message
 *  - typing
 *  - read
 *  - join
 *  - leave
 */
public record WebSocketEventPayload<T>(String type, T data) {}
