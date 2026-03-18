package com.devstagram.domain.dm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
import com.devstagram.domain.dm.dto.DmRoomParticipantSummary;
import com.devstagram.domain.dm.dto.DmRoomSummaryResponse;
import com.devstagram.domain.dm.entity.Dm;
import com.devstagram.domain.dm.repository.DmRepository;
import com.devstagram.domain.dm.repository.DmRoomRepository;
import com.devstagram.domain.dm.repository.DmRoomUserRepository;
import com.devstagram.domain.user.entity.User;

@Service
public class DmService {

    private final DmRepository dmRepository;
    private final DmRoomRepository dmRoomRepository;
    private final DmRoomUserRepository dmRoomUserRepository;

    public DmService(
            DmRepository dmRepository, DmRoomRepository dmRoomRepository, DmRoomUserRepository dmRoomUserRepository) {
        this.dmRepository = dmRepository;
        this.dmRoomRepository = dmRoomRepository;
        this.dmRoomUserRepository = dmRoomUserRepository;
    }

    /**
     * 채팅방 메시지 조회 (cursor 기반 페이징).
     * cursor 가 null 이면 최신 메시지부터 size 개,
     * cursor 가 있으면 해당 ID 이전의 메시지들을 size 개 조회한다.
     */
    public DmMessageSliceResponse getMessages(User user, Long roomId, Long cursor, int size) {
        if (!dmRoomRepository.existsById(roomId)) {
            throw new IllegalArgumentException("존재하지 않는 채팅방입니다.");
        }

        // 방 접근 권한 체크 (간단한 participant 존재 여부 기반)
        if (user != null && user.getId() != null) {
            boolean canAccess = dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, user.getId());
            if (!canAccess) {
                throw new IllegalStateException("채팅방에 참여하고 있지 않습니다.");
            }
        }

        Slice<Dm> slice;
        PageRequest pageable = PageRequest.of(0, size);

        if (cursor == null) {
            slice = dmRepository.findByDmRoom_IdOrderByIdDesc(roomId, pageable);
        } else {
            slice = dmRepository.findByDmRoom_IdAndIdLessThanOrderByIdDesc(roomId, cursor, pageable);
        }

        List<DmMessageResponse> messages = slice.getContent().stream()
                .map(dm -> new DmMessageResponse(
                        dm.getId(),
                        dm.getType(),
                        dm.getContent(),
                        dm.getThumbnailUrl(),
                        dm.isValid(),
                        dm.getCreatedAt()))
                .collect(Collectors.toList());

        Long nextCursor = slice.hasNext() && !messages.isEmpty()
                ? messages.get(messages.size() - 1).id()
                : null;

        return new DmMessageSliceResponse(messages, nextCursor, slice.hasNext());
    }

    /**
     * 로그인한 유저가 속한 DM 방 목록 + 각 방의 마지막 메시지 1개 조회.
     */
    public List<DmRoomSummaryResponse> getRoomsWithLastMessage(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("유저 정보가 필요합니다.");
        }

        return dmRoomUserRepository.findByUser_Id(user.getId()).stream()
                .map(roomUser -> {
                    var room = roomUser.getDmRoom();
                    Dm last = dmRepository.findTopByDmRoom_IdOrderByIdDesc(room.getId());

                    DmMessageResponse lastMessage = null;
                    if (last != null) {
                        lastMessage = new DmMessageResponse(
                                last.getId(),
                                last.getType(),
                                last.getContent(),
                                last.getThumbnailUrl(),
                                last.isValid(),
                                last.getCreatedAt());
                    }

                    // 현재 유저를 제외한 참여자 정보
                    var participantDtos = dmRoomUserRepository.findByDmRoom_Id(room.getId()).stream()
                            .filter(ru -> ru.getUser() != null
                                    && ru.getUser().getId() != null
                                    && !ru.getUser().getId().equals(user.getId()))
                            .map(ru -> new DmRoomParticipantSummary(
                                    ru.getUser().getId(), ru.getUser().getEmail()))
                            .collect(Collectors.toList());

                    // 안 읽은 메시지 수
                    Long lastReadId = roomUser.getLastReadMessageCursor();
                    long unreadCount;
                    if (lastReadId == null) {
                        unreadCount = dmRepository.countByDmRoom_Id(room.getId());
                    } else {
                        unreadCount = dmRepository.countByDmRoom_IdAndIdGreaterThan(room.getId(), lastReadId);
                    }

                    return new DmRoomSummaryResponse(
                            room.getId(),
                            room.getName(),
                            room.getIsGroup(),
                            lastMessage,
                            roomUser.getJoinedAt(),
                            participantDtos,
                            unreadCount);
                })
                .collect(Collectors.toList());
    }
}
