package com.devstagram.domain.dm.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
import com.devstagram.domain.dm.dto.DmRoomSummaryResponse;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUtil;

@RestController
@RequestMapping("/api/dm")
public class DmController {

    private final DmService dmService;

    public DmController(DmService dmService) {
        this.dmService = dmService;
    }

    /**
     * DM 메시지 조회
     * - cursor 가 없으면 최근 15개
     * - cursor 가 있으면 이전 메시지 10개 (size 로 조절 가능)
     */
    @GetMapping("/rooms/{roomId}/messages")
    public RsData<DmMessageSliceResponse> getMessages(
            @PathVariable("roomId") Long roomId,
            @RequestParam(name = "cursor", required = false) Long cursor,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        // 첫 진입 시 기본 15개
        int effectiveSize = (cursor == null) ? 15 : size;

        DmMessageSliceResponse response = dmService.getMessages(currentUserId, roomId, cursor, effectiveSize);

        return RsData.success(response);
    }

    /**
     * DM Room 조회
     * - User 가 들어가있는 Room 에 대한 정보를 Return
     * - Room 에서 가장 최신의 대화 포함
     */
    @GetMapping("/rooms")
    public RsData<java.util.List<DmRoomSummaryResponse>> getRooms() {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        java.util.List<DmRoomSummaryResponse> rooms = dmService.getRoomsWithLastMessage(currentUserId);

        return RsData.success(rooms);
    }
}
