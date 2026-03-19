package com.devstagram.domain.dm.dto;

import java.util.List;

public record DmCreateGroupWithRoomListResponse(Long roomId, List<DmRoomSummaryResponse> rooms) {}
