package com.devstagram.domain.dm.dto;

import java.util.List;

/**
 * 그룹 DM에 멤버 초대 후 응답 (실제로 추가된 유저 ID + 갱신된 내 방 목록).
 */
public record DmInviteGroupMembersResponse(Long roomId, List<Long> addedUserIds, List<DmRoomSummaryResponse> rooms) {}
