package com.devstagram.domain.dm.dto;

import java.util.List;

/**
 * 그룹 채팅방 생성 요청 DTO
 */
public record DmGroupRoomCreateRequest(String name, List<Long> userIds) {}
