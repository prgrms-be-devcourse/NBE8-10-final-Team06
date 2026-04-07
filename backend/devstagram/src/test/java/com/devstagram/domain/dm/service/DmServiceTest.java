package com.devstagram.domain.dm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import com.devstagram.domain.dm.dto.DmMessageResponse;
import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
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

@ExtendWith(MockitoExtension.class)
class DmServiceTest {

    @Mock
    private DmRepository dmRepository;

    @Mock
    private DmRoomRepository dmRoomRepository;

    @Mock
    private DmRoomUserRepository dmRoomUserRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PostRepository postRepository;

    @InjectMocks
    private DmService dmService;

    @Captor
    private ArgumentCaptor<PageRequest> pageRequestCaptor;

    @Test
    void getMessages_roomNotFound_throws() {
        when(dmRoomRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> dmService.getMessages(null, 1L, null, 15)).isInstanceOf(ServiceException.class);
    }

    @Test
    void getMessages_userNotParticipant_throws() {
        when(dmRoomRepository.existsById(1L)).thenReturn(true);

        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(1L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> dmService.getMessages(1L, 1L, null, 15)).isInstanceOf(ServiceException.class);
    }

    @Test
    void getMessages_cursorNull_fetchLatestAndComputesNextCursor() {
        when(dmRoomRepository.existsById(1L)).thenReturn(true);

        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(1L, 1L)).thenReturn(true);

        User sender = mock(User.class);
        when(sender.getId()).thenReturn(10L);

        Dm dm3 = mock(Dm.class);
        when(dm3.getId()).thenReturn(3L);
        when(dm3.getType()).thenReturn(MessageType.TEXT);
        when(dm3.getContent()).thenReturn("c3");
        when(dm3.isValid()).thenReturn(true);
        when(dm3.getSender()).thenReturn(sender);

        Dm dm2 = mock(Dm.class);
        when(dm2.getId()).thenReturn(2L);
        when(dm2.getType()).thenReturn(MessageType.TEXT);
        when(dm2.getContent()).thenReturn("c2");
        when(dm2.isValid()).thenReturn(true);
        when(dm2.getSender()).thenReturn(sender);

        Slice<Dm> slice = new SliceImpl<>(List.of(dm3, dm2), PageRequest.of(0, 2), true);

        when(dmRepository.findByDmRoom_IdOrderByIdDesc(eq(1L), any(PageRequest.class)))
                .thenReturn(slice);

        DmMessageSliceResponse res = dmService.getMessages(1L, 1L, null, 2);

        verify(dmRepository).findByDmRoom_IdOrderByIdDesc(eq(1L), pageRequestCaptor.capture());
        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(2);

        assertThat(res.messages()).hasSize(2);
        assertThat(res.hasNext()).isTrue();
        assertThat(res.nextCursor()).isEqualTo(2L);
    }

    @Test
    void getMessages_cursorProvided_fetchBeforeCursor() {
        when(dmRoomRepository.existsById(1L)).thenReturn(true);

        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(1L, 1L)).thenReturn(true);

        User sender = mock(User.class);
        when(sender.getId()).thenReturn(10L);

        Dm dm9 = mock(Dm.class);
        when(dm9.getId()).thenReturn(9L);
        when(dm9.getType()).thenReturn(MessageType.TEXT);
        when(dm9.getContent()).thenReturn("c9");
        when(dm9.isValid()).thenReturn(true);
        when(dm9.getSender()).thenReturn(sender);

        Slice<Dm> slice = new SliceImpl<>(List.of(dm9), PageRequest.of(0, 1), false);
        when(dmRepository.findByDmRoom_IdAndIdLessThanOrderByIdDesc(eq(1L), eq(10L), any(PageRequest.class)))
                .thenReturn(slice);

        DmMessageSliceResponse res = dmService.getMessages(1L, 1L, 10L, 1);

        verify(dmRepository).findByDmRoom_IdAndIdLessThanOrderByIdDesc(eq(1L), eq(10L), any(PageRequest.class));
        assertThat(res.messages()).hasSize(1);
        assertThat(res.hasNext()).isFalse();
        assertThat(res.nextCursor()).isNull();
    }

    /**
     * 참여자가 2명인 1:1 방에서 나갈 때:
     * - 내 DmRoomUser 만 삭제
     * - 방과 메시지는 상대방을 위해 유지
     */
    @Test
    void leave1v1Room_success() {
        Long userId = 1L;
        Long roomId = 100L;

        DmRoomUser roomUser = mock(DmRoomUser.class);
        DmRoom room = mock(DmRoom.class);

        when(dmRoomUserRepository.findByDmRoom_IdAndUser_Id(roomId, userId)).thenReturn(Optional.of(roomUser));
        when(roomUser.getDmRoom()).thenReturn(room);
        when(room.getIsGroup()).thenReturn(false);
        when(dmRoomUserRepository.countByDmRoom_Id(roomId)).thenReturn(2L);

        dmService.leave1v1Room(userId, roomId);

        verify(dmRoomUserRepository).delete(roomUser);
        verify(dmRoomUserRepository).flush();
        verify(dmRepository, never()).deleteByDmRoom_Id(roomId);
        verify(dmRoomRepository, never()).delete(room);
    }

    /**
     * 마지막 참여자가 1:1 방에서 나갈 때:
     * - 내 DmRoomUser 삭제
     * - 방과 메시지도 함께 삭제
     */
    @Test
    void leave1v1Room_lastUser_success() {
        Long userId = 1L;
        Long roomId = 100L;

        DmRoomUser roomUser = mock(DmRoomUser.class);
        DmRoom room = mock(DmRoom.class);

        when(dmRoomUserRepository.findByDmRoom_IdAndUser_Id(roomId, userId)).thenReturn(Optional.of(roomUser));
        when(roomUser.getDmRoom()).thenReturn(room);
        when(room.getIsGroup()).thenReturn(false);
        when(dmRoomUserRepository.countByDmRoom_Id(roomId)).thenReturn(1L);

        dmService.leave1v1Room(userId, roomId);

        verify(dmRoomUserRepository).delete(roomUser);
        verify(dmRoomUserRepository).flush();
        verify(dmRepository).deleteByDmRoom_Id(roomId);
        verify(dmRoomRepository).delete(room);
    }

    @Test
    void leaveGroupRoom_withOtherUsers_success() {
        Long userId = 1L;
        Long roomId = 100L;

        DmRoomUser roomUser = mock(DmRoomUser.class);
        DmRoom room = mock(DmRoom.class);
        User user = mock(User.class);

        when(dmRoomUserRepository.findByDmRoom_IdAndUser_Id(roomId, userId)).thenReturn(Optional.of(roomUser));
        when(roomUser.getDmRoom()).thenReturn(room);
        when(room.getIsGroup()).thenReturn(true);
        when(roomUser.getUser()).thenReturn(user);
        when(user.getNickname()).thenReturn("testUser");

        when(dmRoomUserRepository.countByDmRoom_Id(roomId)).thenReturn(2L);
        when(dmRoomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, userId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        Dm dm = mock(Dm.class);
        when(dm.getId()).thenReturn(10L);
        when(dm.getType()).thenReturn(MessageType.SYSTEM);
        when(dm.getContent()).thenReturn("testUser님이 나갔습니다.");
        when(dm.getSender()).thenReturn(user);
        when(user.getId()).thenReturn(userId);
        when(dmRepository.save(any(Dm.class))).thenReturn(dm);

        com.devstagram.domain.dm.dto.DmMessageResponse response = dmService.leaveGroupRoom(userId, roomId);

        verify(dmRoomUserRepository).delete(roomUser);
        verify(dmRoomUserRepository).flush();
        assertThat(response).isNotNull();
        assertThat(response.content()).isEqualTo("testUser님이 나갔습니다.");
    }

    /**
     * 1:1 방에서 User B가 메시지를 보낼 때,
     * 이전에 나간 User A(메시지 이력 있음)가 자동으로 재참여되는지 검증.
     */
    @Test
    void sendMessage_1v1_autoRejoinLeftUser() {
        Long senderUserId = 2L; // User B (방에 남아있는 사람)
        Long leftUserId = 1L; // User A (방을 나간 사람)
        Long roomId = 100L;

        DmRoom room = mock(DmRoom.class);
        User sender = mock(User.class);
        User leftUser = mock(User.class);
        Dm savedDm = mock(Dm.class);

        when(dmRoomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(room.getIsGroup()).thenReturn(false);
        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, senderUserId))
                .thenReturn(true);
        when(userRepository.findById(senderUserId)).thenReturn(Optional.of(sender));

        when(savedDm.getId()).thenReturn(10L);
        when(savedDm.getType()).thenReturn(MessageType.TEXT);
        when(savedDm.getContent()).thenReturn("안녕하세요");
        when(savedDm.getThumbnailUrl()).thenReturn(null);
        when(savedDm.isValid()).thenReturn(true);
        when(savedDm.getSender()).thenReturn(sender);
        when(sender.getId()).thenReturn(senderUserId);
        when(dmRepository.save(any(Dm.class))).thenReturn(savedDm);

        // 나간 유저(User A)가 메시지 이력에 존재
        when(dmRepository.findSenderIdsNotInRoom(roomId)).thenReturn(List.of(leftUserId));
        when(dmRoomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(userRepository.findById(leftUserId)).thenReturn(Optional.of(leftUser));

        DmSendMessageRequest request = new DmSendMessageRequest(MessageType.TEXT, "안녕하세요", null);
        DmMessageResponse response = dmService.sendMessage(senderUserId, roomId, request);

        assertThat(response).isNotNull();
        assertThat(response.content()).isEqualTo("안녕하세요");
        // 나간 User A가 DmRoomUser로 재등록됐는지 확인
        verify(dmRoomUserRepository).save(any(DmRoomUser.class));
    }

    /**
     * 1:1 방에서 메시지 전송 시 나간 유저가 없으면 재참여 저장이 발생하지 않는지 검증.
     */
    @Test
    void sendMessage_1v1_noLeftUser_noRejoin() {
        Long senderUserId = 2L;
        Long roomId = 100L;

        DmRoom room = mock(DmRoom.class);
        User sender = mock(User.class);
        Dm savedDm = mock(Dm.class);

        when(dmRoomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(room.getIsGroup()).thenReturn(false);
        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(roomId, senderUserId))
                .thenReturn(true);
        when(userRepository.findById(senderUserId)).thenReturn(Optional.of(sender));

        when(savedDm.getId()).thenReturn(10L);
        when(savedDm.getType()).thenReturn(MessageType.TEXT);
        when(savedDm.getContent()).thenReturn("안녕하세요");
        when(savedDm.getThumbnailUrl()).thenReturn(null);
        when(savedDm.isValid()).thenReturn(true);
        when(savedDm.getSender()).thenReturn(sender);
        when(sender.getId()).thenReturn(senderUserId);
        when(dmRepository.save(any(Dm.class))).thenReturn(savedDm);

        // 나간 유저 없음
        when(dmRepository.findSenderIdsNotInRoom(roomId)).thenReturn(List.of());

        DmSendMessageRequest request = new DmSendMessageRequest(MessageType.TEXT, "안녕하세요", null);
        dmService.sendMessage(senderUserId, roomId, request);

        // DmRoomUser 저장이 발생하지 않아야 함
        verify(dmRoomUserRepository, never()).save(any(DmRoomUser.class));
    }

    @Test
    void leaveGroupRoom_lastUser_success() {
        Long userId = 1L;
        Long roomId = 100L;

        DmRoomUser roomUser = mock(DmRoomUser.class);
        DmRoom room = mock(DmRoom.class);

        when(dmRoomUserRepository.findByDmRoom_IdAndUser_Id(roomId, userId)).thenReturn(Optional.of(roomUser));
        when(roomUser.getDmRoom()).thenReturn(room);
        when(room.getIsGroup()).thenReturn(true);
        when(dmRoomUserRepository.countByDmRoom_Id(roomId)).thenReturn(1L);

        com.devstagram.domain.dm.dto.DmMessageResponse response = dmService.leaveGroupRoom(userId, roomId);

        verify(dmRoomUserRepository).delete(roomUser);
        verify(dmRoomUserRepository).flush();
        verify(dmRepository).deleteByDmRoom_Id(roomId);
        verify(dmRoomRepository).delete(room);
        assertThat(response).isNull();
    }
}
