package com.devstagram.domain.dm.dto;

import java.util.List;

public record DmMessageSliceResponse(List<DmMessageResponse> messages, Long nextCursor, boolean hasNext) {}
