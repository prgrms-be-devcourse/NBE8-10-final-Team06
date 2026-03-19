package com.devstagram.domain.dm.service;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import com.devstagram.domain.dm.dto.DmCreate1v1WithRoomListResponse;
import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
import com.devstagram.domain.dm.dto.DmRoomParticipantSummary;
import com.devstagram.domain.dm.dto.DmRoomSummaryResponse;
import com.devstagram.domain.dm.dto.DmSendMessageRequest;
import com.devstagram.domain.dm.entity.Dm;
import com.devstagram.domain.dm.entity.DmRoom;
import com.devstagram.domain.dm.entity.DmRoomUser;
import com.devstagram.domain.dm.entity.MessageType;
import com.devstagram.domain.dm.repository.DmRepository;
import com.devstagram.domain.dm.repository.DmRoomRepository;
import com.devstagram.domain.dm.repository.DmRoomUserRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

@Service
public class DmService {

    private final DmRepository dmRepository;
    private final DmRoomRepository dmRoomRepository;
    private final DmRoomUserRepository dmRoomUserRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    public DmService(
            DmRepository dmRepository,
            DmRoomRepository dmRoomRepository,
            DmRoomUserRepository dmRoomUserRepository,
            UserRepository userRepository,
            PostRepository postRepository) {
        this.dmRepository = dmRepository;
        this.dmRoomRepository = dmRoomRepository;
        this.dmRoomUserRepository = dmRoomUserRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
    }

    /**
     * 채팅방 메시지 조회 (cursor 기반 페이징).
     * cursor 가 null 이면 최신 메시지부터 size 개,
     * cursor 가 있으면 해당 ID 이전의 메시지들을 size 개 조회한다.
     */
    public DmMessageSliceResponse getMessages(Long userId, Long roomId, Long cursor, int size) {
        if (!dmRoomRepository.existsById(roomId)) {
            throw new ServiceException("404-F-1", "존재하지 않는 채팅방입니다.");
        }

        // 방 접근 권한 체크 (간단한 participant 존재 여부 기반)
        if (userId != null) {
            boolean canAccess = dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, userId);
            if (!canAccess) {
                throw new ServiceException("403-F-1", "채팅방에 참여하고 있지 않습니다.");
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
    public List<DmRoomSummaryResponse> getRoomsWithLastMessage(Long userId) {
        if (userId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }

        return dmRoomUserRepository.findByUser_Id(userId).stream()
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
                                    && !ru.getUser().getId().equals(userId))
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

    /**
     * 1:1 DM 방 생성/재사용 + 내 room list 반환을 한 번에 처리합니다.
     *
     * 기존 구현은:
     * - getOrCreate1v1RoomId()에서 내 room list를 조회
     * - 이후 getRoomsWithLastMessage()에서 다시 내 room list를 조회
     * 하는 중복이 있었습니다.
     *
     * 이 메서드는 room list 조회 결과를 재사용해 중복 쿼리를 줄입니다.
     */
    public DmCreate1v1WithRoomListResponse create1v1RoomAndReturnRooms(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (currentUserId.equals(otherUserId)) {
            throw new ServiceException("400-F-1", "자기 자신과의 1:1 DM 은 생성할 수 없습니다.");
        }

        List<DmRoomUser> myRoomUsers = dmRoomUserRepository.findByUser_Id(currentUserId);

        // 1:1 후보 방 탐색은 "이미 조회한 내 room list"에서 수행
        var roomById = myRoomUsers.stream()
                .filter(ru -> ru.getDmRoom() != null && ru.getDmRoom().getId() != null)
                .collect(Collectors.toMap(ru -> ru.getDmRoom().getId(), ru -> ru.getDmRoom(), (a, b) -> a));

        Long existingRoomId = roomById.values().stream()
                .filter(room -> room.getIsGroup() != null && !room.getIsGroup())
                .filter(room -> dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(room.getId(), otherUserId))
                .filter(room -> dmRoomUserRepository.countByDmRoom_Id(room.getId()) == 2)
                .map(DmRoom::getId)
                .findFirst()
                .orElse(null);

        if (existingRoomId != null) {
            List<DmRoomSummaryResponse> rooms = getRoomsWithLastMessageFromRoomUsers(currentUserId, myRoomUsers);
            return new DmCreate1v1WithRoomListResponse(existingRoomId, rooms);
        }

        // 방이 없으면 생성 후, 정확한 list를 위해 다시 room list를 조회합니다(생성 경로에서는 어쩔 수 없음).
        Long createdRoomId = create1v1Room(currentUserId, otherUserId);
        List<DmRoomSummaryResponse> rooms = getRoomsWithLastMessage(currentUserId);
        return new DmCreate1v1WithRoomListResponse(createdRoomId, rooms);
    }

    private List<DmRoomSummaryResponse> getRoomsWithLastMessageFromRoomUsers(
            Long userId, List<DmRoomUser> myRoomUsers) {
        return myRoomUsers.stream()
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
                                    && !ru.getUser().getId().equals(userId))
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

    /**
     * DM 메시지 전송 (저장 + 브로드캐스트용 응답 생성).
     */
    public DmMessageResponse sendMessage(Long userId, Long roomId, DmSendMessageRequest request) {
        if (userId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (request == null
                || request.type() == null
                || request.content() == null
                || request.content().isBlank()) {
            throw new ServiceException("400-F-1", "메시지 내용이 필요합니다.");
        }

        DmRoom room =
                dmRoomRepository.findById(roomId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 채팅방입니다."));

        boolean canAccess = dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, userId);
        if (!canAccess) {
            throw new ServiceException("403-F-1", "채팅방에 참여하고 있지 않습니다.");
        }

        User sender =
                userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));

        String thumbnailUrl = request.thumbnail();
        boolean valid = true;

        // STORY 는 서버 최종 판단
        if (request.type() == MessageType.STORY) {
            boolean expired = isExpiredStory(request.content());
            valid = !expired;
            if (expired) thumbnailUrl = null;
        }

        // POST 삭제 여부는 서버 최종 판단 (post 존재 여부로 valid 결정)
        if (request.type() == MessageType.POST) {
            Long postId = extractIdFromDevstagramUrl(request.content(), "id");
            if (postId != null) {
                valid = postRepository.findById(postId).isPresent();
                if (valid) {
                    thumbnailUrl = postRepository
                            .findById(postId)
                            .map(p -> p.getThumbnailUrl())
                            .orElse(thumbnailUrl);
                } else {
                    thumbnailUrl = null;
                }
            }
        }

        Dm dm = Dm.create(room, sender, request.type(), request.content(), thumbnailUrl, valid);

        Dm saved = dmRepository.save(dm);

        return new DmMessageResponse(
                saved.getId(),
                saved.getType(),
                saved.getContent(),
                saved.getThumbnailUrl(),
                saved.isValid(),
                saved.getCreatedAt());
    }

    /**
     * 메시지 읽음 처리: lastReadMessageCursor 갱신.
     */
    public Long markRead(Long userId, Long roomId, Long messageId) {
        if (userId == null || roomId == null || messageId == null) {
            throw new ServiceException("400-F-1", "읽기 처리에 필요한 값이 없습니다.");
        }

        DmRoomUser roomUser = dmRoomUserRepository
                .findByDmRoom_IdAndUser_Id(roomId, userId)
                .orElseThrow(() -> new ServiceException("403-F-1", "채팅방에 참여하고 있지 않습니다."));

        roomUser.markRead(messageId);
        dmRoomUserRepository.save(roomUser);

        return messageId;
    }

    private boolean isExpiredStory(String content) {
        if (content == null || content.isBlank()) return false;
        // devstagram://story?id=123&v=1712341234
        int vIdx = content.indexOf("v=");
        if (vIdx < 0) return false;

        String afterV = content.substring(vIdx + 2);
        int ampIdx = afterV.indexOf('&');
        String vStr = ampIdx >= 0 ? afterV.substring(0, ampIdx) : afterV;

        try {
            long v = Long.parseLong(vStr);
            long createdMillis = v < 1_000_000_000_000L ? v * 1000L : v; // 10자리면 초로 가정
            long diff = System.currentTimeMillis() - createdMillis;
            return diff > (24L * 60L * 60L * 1000L);
        } catch (Exception e) {
            return false; // 파싱 실패 시 안전하게 만료 아님
        }
    }

    private Long extractIdFromDevstagramUrl(String content, String key) {
        if (content == null || content.isBlank()) return null;

        // 예: devstagram://post?id=123
        int keyIdx = content.indexOf(key + "=");
        if (keyIdx < 0) return null;

        String after = content.substring(keyIdx + key.length() + 1);
        int ampIdx = after.indexOf('&');
        String raw = ampIdx >= 0 ? after.substring(0, ampIdx) : after;

        try {
            long v = Long.parseLong(raw);
            return v;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 1:1 DM 방 생성/재사용
     * - 이미 존재하는 1:1 방이면 재사용
     * - 없으면 신규 방 생성 후 두 유저를 participants 로 등록
     *
     * 방 재사용 기준:
     * - 같은 방에 currentUserId 와 otherUserId 가 모두 참여
     * - room.isGroup == false
     * - 참여자 수가 2명인 경우만 1:1로 간주
     */
    public Long getOrCreate1v1RoomId(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (currentUserId.equals(otherUserId)) {
            throw new ServiceException("400-F-1", "자기 자신과의 1:1 DM 은 생성할 수 없습니다.");
        }

        // 현재 유저가 포함된 방들 중에서 1:1 후보 탐색
        return dmRoomUserRepository.findByUser_Id(currentUserId).stream()
                .map(DmRoomUser::getDmRoom)
                .distinct()
                .filter(room -> room.getIsGroup() != null && !room.getIsGroup())
                .filter(room -> dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(room.getId(), otherUserId))
                .filter(room -> dmRoomUserRepository.countByDmRoom_Id(room.getId()) == 2)
                .findFirst()
                .map(DmRoom::getId)
                .orElseGet(() -> create1v1Room(currentUserId, otherUserId));
    }

    private Long create1v1Room(Long currentUserId, Long otherUserId) {
        DmRoom room;
        User currentUser = userRepository
                .findById(currentUserId)
                .orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));
        User otherUser = userRepository
                .findById(otherUserId)
                .orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));
        room = DmRoom.create1v1Room(otherUser.getNickname());

        DmRoom savedRoom = dmRoomRepository.save(room);

        DmRoomUser ru1 = DmRoomUser.create(savedRoom, currentUser, new Date());
        DmRoomUser ru2 = DmRoomUser.create(savedRoom, otherUser, new Date());

        dmRoomUserRepository.save(ru1);
        dmRoomUserRepository.save(ru2);

        return savedRoom.getId();
    }
}
