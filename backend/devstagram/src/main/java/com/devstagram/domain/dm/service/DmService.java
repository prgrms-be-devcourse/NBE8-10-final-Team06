package com.devstagram.domain.dm.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import com.devstagram.domain.dm.dto.DmCreate1v1WithRoomListResponse;
import com.devstagram.domain.dm.dto.DmCreateGroupWithRoomListResponse;
import com.devstagram.domain.dm.dto.DmGroupRoomCreateRequest;
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

import jakarta.transaction.Transactional;

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
                        toKstString(dm.getCreatedAt()),
                        dm.getSender().getId() // 누가 보냈는지까지 같이 담아서
                        ))
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

        List<DmRoomUser> myRoomUsers = dmRoomUserRepository.findByUser_Id(userId);
        return buildRoomsSummary(userId, myRoomUsers);
    }

    /**
     * 1:1 DM 방 생성/재사용 + 내 room list 반환을 한 번에 처리합니다.
     *
     * 우선순위:
     * 1. 두 유저 모두 현재 참여 중인 방이 있으면 재사용
     * 2. 내가 나갔지만 상대방이 남아있는 방이 있으면 재참여
     * 3. 방 자체가 없으면 신규 생성
     */
    @Transactional
    public DmCreate1v1WithRoomListResponse create1v1RoomAndReturnRooms(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (currentUserId.equals(otherUserId)) {
            throw new ServiceException("400-F-1", "자기 자신과의 1:1 DM 은 생성할 수 없습니다.");
        }

        // 1. 두 유저 모두 현재 참여 중
        Long existingRoomId =
                dmRoomUserRepository.find1v1RoomId(currentUserId, otherUserId).orElse(null);
        if (existingRoomId != null) {
            List<DmRoomUser> myRoomUsers = dmRoomUserRepository.findByUser_Id(currentUserId);
            List<DmRoomSummaryResponse> rooms = buildRoomsSummary(currentUserId, myRoomUsers);
            return new DmCreate1v1WithRoomListResponse(existingRoomId, rooms);
        }

        // 2. 내가 나갔고 상대방이 남아있는 방 → 재참여
        Long rejoinRoomId = dmRoomUserRepository
                .find1v1RoomWhereUserLeft(currentUserId, otherUserId)
                .orElse(null);
        if (rejoinRoomId != null) {
            rejoin1v1Room(currentUserId, rejoinRoomId);
            List<DmRoomSummaryResponse> rooms = getRoomsWithLastMessage(currentUserId);
            return new DmCreate1v1WithRoomListResponse(rejoinRoomId, rooms);
        }

        // 3. 방 자체가 없으면 신규 생성
        Long createdRoomId = create1v1Room(currentUserId, otherUserId);
        List<DmRoomSummaryResponse> rooms = getRoomsWithLastMessage(currentUserId);
        return new DmCreate1v1WithRoomListResponse(createdRoomId, rooms);
    }

    /**
     * 그룹 채팅방 생성 + 내 room list 반환
     */
    public DmCreateGroupWithRoomListResponse createGroupRoomAndReturnRooms(
            Long currentUserId, DmGroupRoomCreateRequest request) {
        if (currentUserId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (request == null) {
            throw new ServiceException("400-F-1", "요청 값이 필요합니다.");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new ServiceException("400-F-2", "방 이름이 필요합니다.");
        }
        if (request.userIds() == null || request.userIds().isEmpty()) {
            throw new ServiceException("400-F-3", "참여 유저 목록이 필요합니다.");
        }

        // currentUser 포함 + 중복 제거
        Set<Long> memberIds =
                request.userIds().stream().filter(id -> id != null).collect(Collectors.toSet());
        memberIds.add(currentUserId);

        // 최소 2명 (currentUser 포함)
        if (memberIds.size() < 2) {
            throw new ServiceException("400-F-4", "그룹 채팅은 최소 2명 이상이어야 합니다.");
        }

        DmRoom room = DmRoom.createGroupRoom(request.name());
        DmRoom savedRoom = dmRoomRepository.save(room);

        List<DmRoomUser> roomUsers = memberIds.stream()
                .map(memberId -> {
                    User member = userRepository
                            .findById(memberId)
                            .orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));
                    return DmRoomUser.create(savedRoom, member, new Date());
                })
                .collect(Collectors.toList());

        dmRoomUserRepository.saveAll(roomUsers);

        List<DmRoomSummaryResponse> rooms = getRoomsWithLastMessage(currentUserId);
        return new DmCreateGroupWithRoomListResponse(savedRoom.getId(), rooms);
    }

    private List<DmRoomSummaryResponse> buildRoomsSummary(Long userId, List<DmRoomUser> myRoomUsers) {
        if (myRoomUsers == null || myRoomUsers.isEmpty()) {
            return List.of();
        }

        Set<Long> roomIds = myRoomUsers.stream()
                .map(ru -> ru.getDmRoom() == null ? null : ru.getDmRoom().getId())
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        if (roomIds.isEmpty()) {
            return List.of();
        }

        // 1) 각 room 별 최신 메시지 1개를 배치로 조회합니다.
        Map<Long, Dm> latestByRoomId = dmRepository.findLatestByDmRoom_IdIn(roomIds).stream()
                .collect(Collectors.toMap(d -> d.getDmRoom().getId(), d -> d));

        // 2) 각 room 별 참여자도 배치로 조회합니다. (join fetch user)
        List<DmRoomUser> participants = dmRoomUserRepository.findParticipantsByDmRoom_IdIn(roomIds);
        Map<Long, List<DmRoomUser>> participantsByRoomId = participants.stream()
                .collect(Collectors.groupingBy(ru -> ru.getDmRoom().getId()));

        // 3) lastReadMessageCursor 가 null 인 room 은 total count를 1번에 조회합니다.
        Set<Long> unreadRoomIds = myRoomUsers.stream()
                .filter(ru -> ru.getLastReadMessageCursor() == null)
                .map(ru -> ru.getDmRoom().getId())
                .collect(Collectors.toSet());

        Map<Long, Long> totalCountWhenUnread = new HashMap<>();
        if (!unreadRoomIds.isEmpty()) {
            List<Object[]> totals = dmRepository.countTotalByDmRoom_IdIn(unreadRoomIds);
            for (Object[] row : totals) {
                Long roomId = (Long) row[0];
                Long cnt = (Long) row[1];
                totalCountWhenUnread.put(roomId, cnt);
            }
        }

        // 4) in-memory 조립 (lastRead != null 인 room 은 기존 countBy* 1회/room 로직 유지)
        return myRoomUsers.stream()
                .map(roomUser -> {
                    var room = roomUser.getDmRoom();
                    Long roomId = room.getId();

                    Dm last = latestByRoomId.get(roomId);
                    DmMessageResponse lastMessage = null;
                    if (last != null) {
                        lastMessage = new DmMessageResponse(
                                last.getId(),
                                last.getType(),
                                last.getContent(),
                                last.getThumbnailUrl(),
                                last.isValid(),
                                toKstString(last.getCreatedAt()),
                                last.getSender().getId());
                    }

                    var participantDtos = participantsByRoomId.getOrDefault(roomId, List.of()).stream()
                            .filter(ru -> ru.getUser() != null
                                    && ru.getUser().getId() != null
                                    && !ru.getUser().getId().equals(userId))
                            .map(ru -> new DmRoomParticipantSummary(
                                    ru.getUser().getId(),
                                    ru.getUser().getEmail(),
                                    ru.getUser().getNickname(), // 상대 닉네임, 프로필 추가
                                    ru.getUser().getProfileImageUrl()))
                            .collect(Collectors.toList());

                    Long lastReadId = roomUser.getLastReadMessageCursor();
                    long unreadCount;
                    if (lastReadId == null) {
                        unreadCount = totalCountWhenUnread.getOrDefault(roomId, 0L);
                    } else {
                        unreadCount = dmRepository.countByDmRoom_IdAndIdGreaterThan(roomId, lastReadId);
                    }

                    return new DmRoomSummaryResponse(
                            roomId,
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
     *
     * 1:1 방에서 메시지를 전송할 때, 상대방이 이전에 방을 나간 상태라면
     * 자동으로 재참여 처리하여 상대방의 DM 목록에 방이 다시 나타나도록 한다.
     */
    @Transactional
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
            if (expired) {
                thumbnailUrl = null;
            }
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

        // 1:1 방에서 메시지 전송 시: 나간 상대방을 자동으로 재참여시킨다
        if (!room.getIsGroup()) {
            List<Long> leftUserIds = dmRepository.findSenderIdsNotInRoom(roomId);
            for (Long leftUserId : leftUserIds) {
                rejoin1v1Room(leftUserId, roomId);
            }
        }

        return new DmMessageResponse(
                saved.getId(),
                saved.getType(),
                saved.getContent(),
                saved.getThumbnailUrl(),
                saved.isValid(),
                toKstString(saved.getCreatedAt()),
                saved.getSender().getId());
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
        if (content == null || content.isBlank()) {
            return false;
        }
        // devstagram://story?id=123&v=1712341234
        int vIdx = content.indexOf("v=");
        if (vIdx < 0) {
            return false;
        }

        String afterV = content.substring(vIdx + 2);
        int ampIdx = afterV.indexOf('&');
        String vStr = ampIdx >= 0 ? afterV.substring(0, ampIdx) : afterV;

        try {
            long timestamp = Long.parseLong(vStr);
            long createdMillis = timestamp < 1_000_000_000_000L ? timestamp * 1000L : timestamp; // 10자리면 초로 가정
            long diff = System.currentTimeMillis() - createdMillis;
            return diff > (24L * 60L * 60L * 1000L);
        } catch (Exception ex) {
            return false; // 파싱 실패 시 안전하게 만료 아님
        }
    }

    private Long extractIdFromDevstagramUrl(String content, String key) {
        if (content == null || content.isBlank()) {
            return null;
        }

        // 예: devstagram://post?id=123
        int keyIdx = content.indexOf(key + "=");
        if (keyIdx < 0) {
            return null;
        }

        String after = content.substring(keyIdx + key.length() + 1);
        int ampIdx = after.indexOf('&');
        String raw = ampIdx >= 0 ? after.substring(0, ampIdx) : after;

        try {
            long parsedId = Long.parseLong(raw);
            return parsedId;
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * 1:1 DM 방 생성/재사용
     *
     * 우선순위:
     * 1. 두 유저 모두 현재 참여 중인 방이 있으면 재사용
     * 2. 내가 나갔지만 상대방이 남아있는 방이 있으면 재참여
     * 3. 방 자체가 없으면 신규 생성
     */
    @Transactional
    public Long getOrCreate1v1RoomId(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            throw new ServiceException("400-F-1", "유저 정보가 필요합니다.");
        }
        if (currentUserId.equals(otherUserId)) {
            throw new ServiceException("400-F-1", "자기 자신과의 1:1 DM 은 생성할 수 없습니다.");
        }

        // 1. 두 유저 모두 현재 참여 중
        Optional<Long> existingRoomId = dmRoomUserRepository.find1v1RoomId(currentUserId, otherUserId);
        if (existingRoomId.isPresent()) {
            return existingRoomId.get();
        }

        // 2. 내가 나갔고 상대방이 남아있는 방 → 재참여
        Optional<Long> rejoinRoomId = dmRoomUserRepository.find1v1RoomWhereUserLeft(currentUserId, otherUserId);
        if (rejoinRoomId.isPresent()) {
            rejoin1v1Room(currentUserId, rejoinRoomId.get());
            return rejoinRoomId.get();
        }

        // 3. 방 자체가 없으면 신규 생성
        return create1v1Room(currentUserId, otherUserId);
    }

    /** 나갔던 1:1 방에 다시 참여자로 등록 */
    private void rejoin1v1Room(Long userId, Long roomId) {
        DmRoom room =
                dmRoomRepository.findById(roomId).orElseThrow(() -> new ServiceException("404-F-1", "채팅방이 존재하지 않습니다."));
        User user =
                userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));
        DmRoomUser newRoomUser = DmRoomUser.create(room, user, new Date());
        dmRoomUserRepository.save(newRoomUser);
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

    // 1:1 채팅방 나가기 - 내 참여 정보만 삭제, 상대방은 방·메시지 유지
    @Transactional
    public void leave1v1Room(Long userId, Long roomId) {
        DmRoomUser roomUser = getValidRoomUser(userId, roomId);
        DmRoom room = roomUser.getDmRoom();

        if (room.getIsGroup()) {
            throw new ServiceException("400-F-2", "1:1 채팅방이 아닙니다.");
        }

        long currentUsers = dmRoomUserRepository.countByDmRoom_Id(roomId);

        // 내 참여 정보만 삭제 (방과 메시지는 상대방을 위해 유지)
        dmRoomUserRepository.delete(roomUser);
        dmRoomUserRepository.flush();

        // 내가 마지막 참여자였으면 방과 메시지도 삭제
        if (currentUsers == 1) {
            dmRepository.deleteByDmRoom_Id(roomId);
            dmRoomRepository.delete(room);
        }
    }

    // 그룹 채팅방 퇴장 : 퇴장 메시지 보내고 나감
    @Transactional
    public DmMessageResponse leaveGroupRoom(Long userId, Long roomId) {
        DmRoomUser roomUser = getValidRoomUser(userId, roomId);
        DmRoom room = roomUser.getDmRoom();

        if (!room.getIsGroup()) {
            throw new ServiceException("400-F-2", "그룹 채팅방이 아닙니다.");
        }

        long currentUsers = dmRoomUserRepository.countByDmRoom_Id(roomId);
        DmMessageResponse response = null;

        // 다른 사람이 있다면 퇴장 메시지 먼저 생성 (내 권한이 살아있을 때)
        if (currentUsers > 1) {
            String systemMsg = roomUser.getUser().getNickname() + "님이 나갔습니다.";
            DmSendMessageRequest request = new DmSendMessageRequest(MessageType.SYSTEM, systemMsg, null);

            response = this.sendMessage(userId, roomId, request);
        }

        // 내 참여 정보 삭제
        dmRoomUserRepository.delete(roomUser);
        dmRoomUserRepository.flush();

        // 마지막 사람이 나간 거면 채팅방 삭제
        if (currentUsers == 1) {
            dmRepository.deleteByDmRoom_Id(roomId);
            dmRoomRepository.delete(room);
        }

        return response;
    }

    // 채팅방 참여 여부 검증
    private DmRoomUser getValidRoomUser(Long userId, Long roomId) {
        if (userId == null || roomId == null) {
            throw new ServiceException("400-F-1", "유저 또는 방 정보가 필요합니다.");
        }
        return dmRoomUserRepository
                .findByDmRoom_IdAndUser_Id(roomId, userId)
                .orElseThrow(() -> new ServiceException("404-F-1", "참여 중인 채팅방이 아닙니다."));
    }

    private String toKstString(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        return dateTime.atZone(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }
}
