package com.devstagram.domain.dm.dto;

import java.util.List;

public record DmCreate1v1WithRoomListResponse(Long roomId, List<DmRoomSummaryResponse> rooms) {}
