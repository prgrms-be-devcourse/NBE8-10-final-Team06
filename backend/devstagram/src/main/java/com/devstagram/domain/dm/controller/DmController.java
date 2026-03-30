package com.devstagram.domain.dm.controller;

import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.dm.dto.*;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUtil;

@RestController
@RequestMapping("/api/dm")
public class DmController {

    private final DmService dmService;
    private final SimpMessagingTemplate messagingTemplate;

    public DmController(DmService dmService, SimpMessagingTemplate messagingTemplate) {
        this.dmService = dmService;
        this.messagingTemplate = messagingTemplate;
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
    public RsData<List<DmRoomSummaryResponse>> getRooms() {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        List<DmRoomSummaryResponse> rooms = dmService.getRoomsWithLastMessage(currentUserId);

        return RsData.success(rooms);
    }

    /**
     * 1:1 DM 방 생성/재사용 + 내 room list 반환
     */
    @PostMapping("/rooms/1v1/{otherUserId}")
    public RsData<DmCreate1v1WithRoomListResponse> create1v1Room(@PathVariable("otherUserId") Long otherUserId) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        return RsData.success(dmService.create1v1RoomAndReturnRooms(currentUserId, otherUserId));
    }

    /**
     * 그룹 채팅방 생성 + 내 room list 반환
     */
    @PostMapping("/rooms/group")
    public RsData<DmCreateGroupWithRoomListResponse> createGroupRoom(@RequestBody DmGroupRoomCreateRequest request) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        return RsData.success(dmService.createGroupRoomAndReturnRooms(currentUserId, request));
    }

    // 1:1 채팅방 나가기 (방 삭제)
    @DeleteMapping("/rooms/1v1/{roomId}")
    public RsData<String> leave1v1Room(@PathVariable("roomId") Long roomId) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        dmService.leave1v1Room(currentUserId, roomId);

        return RsData.success("1:1 채팅방을 나갔습니다.");
    }

    // 그룹 채팅방 나가기 (나만 퇴장 + 퇴장 메시지 발송)
    @DeleteMapping("/rooms/group/{roomId}")
    public RsData<String> leaveGroupRoom(@PathVariable("roomId") Long roomId) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        DmMessageResponse systemMessage = dmService.leaveGroupRoom(currentUserId, roomId);

        // 다른 유저들에게 퇴장 메시지 발송
        if (systemMessage != null) {
            WebSocketEventPayload<DmMessageResponse> payload = new WebSocketEventPayload<>("message", systemMessage);

            messagingTemplate.convertAndSend("/topic/dm." + roomId, payload);
        }

        return RsData.success("그룹 채팅방을 나갔습니다.");
    }
}
