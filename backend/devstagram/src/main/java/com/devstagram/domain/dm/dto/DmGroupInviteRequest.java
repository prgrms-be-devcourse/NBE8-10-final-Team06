package com.devstagram.domain.dm.dto;

import java.util.List;

/**
 * 기존 그룹 DM 방에 참여자를 초대할 때 사용하는 요청 DTO.
 */
public record DmGroupInviteRequest(List<Long> userIds) {}
