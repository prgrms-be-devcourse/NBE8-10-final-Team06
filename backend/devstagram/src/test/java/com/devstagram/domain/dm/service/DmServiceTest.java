package com.devstagram.domain.dm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import java.util.List;

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

import com.devstagram.domain.dm.dto.DmGroupInviteRequest;
import com.devstagram.domain.dm.dto.DmInviteGroupMembersResponse;
import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
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

        Dm dm3 = mock(Dm.class);
        when(dm3.getId()).thenReturn(3L);
        when(dm3.getType()).thenReturn(MessageType.TEXT);
        when(dm3.getContent()).thenReturn("c3");
        when(dm3.isValid()).thenReturn(true);

        Dm dm2 = mock(Dm.class);
        when(dm2.getId()).thenReturn(2L);
        when(dm2.getType()).thenReturn(MessageType.TEXT);
        when(dm2.getContent()).thenReturn("c2");
        when(dm2.isValid()).thenReturn(true);

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

        Dm dm9 = mock(Dm.class);
        when(dm9.getId()).thenReturn(9L);
        when(dm9.getType()).thenReturn(MessageType.TEXT);
        when(dm9.getContent()).thenReturn("c9");
        when(dm9.isValid()).thenReturn(true);

        Slice<Dm> slice = new SliceImpl<>(List.of(dm9), PageRequest.of(0, 1), false);
        when(dmRepository.findByDmRoom_IdAndIdLessThanOrderByIdDesc(eq(1L), eq(10L), any(PageRequest.class)))
                .thenReturn(slice);

        DmMessageSliceResponse res = dmService.getMessages(1L, 1L, 10L, 1);

        verify(dmRepository).findByDmRoom_IdAndIdLessThanOrderByIdDesc(eq(1L), eq(10L), any(PageRequest.class));
        assertThat(res.messages()).hasSize(1);
        assertThat(res.hasNext()).isFalse();
        assertThat(res.nextCursor()).isNull();
    }

    @Test
    void inviteMembersToGroupRoom_notGroupRoom_throws() {
        DmRoom room = mock(DmRoom.class);
        when(room.getIsGroup()).thenReturn(false);
        when(dmRoomRepository.findById(10L)).thenReturn(java.util.Optional.of(room));

        assertThatThrownBy(() -> dmService.inviteMembersToGroupRoom(1L, 10L, new DmGroupInviteRequest(List.of(2L))))
                .isInstanceOf(ServiceException.class);
    }

    @Test
    void inviteMembersToGroupRoom_notParticipant_throws() {
        DmRoom room = mock(DmRoom.class);
        when(room.getIsGroup()).thenReturn(true);
        when(dmRoomRepository.findById(10L)).thenReturn(java.util.Optional.of(room));
        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(10L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> dmService.inviteMembersToGroupRoom(1L, 10L, new DmGroupInviteRequest(List.of(2L))))
                .isInstanceOf(ServiceException.class);
    }

    @Test
    void inviteMembersToGroupRoom_addsNewMembersAndReturnsAddedIds() {
        DmRoom room = mock(DmRoom.class);
        when(room.getIsGroup()).thenReturn(true);
        when(dmRoomRepository.findById(10L)).thenReturn(java.util.Optional.of(room));
        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(10L, 1L)).thenReturn(true);

        DmRoomUser existing = mock(DmRoomUser.class);
        User existingUser = mock(User.class);
        when(existingUser.getId()).thenReturn(1L);
        when(existing.getUser()).thenReturn(existingUser);
        when(dmRoomUserRepository.findByDmRoom_Id(10L)).thenReturn(List.of(existing));

        User u2 = mock(User.class);
        User u3 = mock(User.class);
        when(userRepository.findById(2L)).thenReturn(java.util.Optional.of(u2));
        when(userRepository.findById(3L)).thenReturn(java.util.Optional.of(u3));

        when(dmRoomUserRepository.findByUser_Id(1L)).thenReturn(List.of());

        DmInviteGroupMembersResponse res =
                dmService.inviteMembersToGroupRoom(1L, 10L, new DmGroupInviteRequest(List.of(2L, 3L, 2L)));

        verify(dmRoomUserRepository).saveAll(anyList());
        assertThat(res.roomId()).isEqualTo(10L);
        assertThat(res.addedUserIds()).containsExactlyInAnyOrder(2L, 3L);
        assertThat(res.rooms()).isNotNull();
    }
}
