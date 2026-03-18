package com.devstagram.domain.dm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

import com.devstagram.domain.dm.dto.DmMessageSliceResponse;
import com.devstagram.domain.dm.entity.Dm;
import com.devstagram.domain.dm.entity.MessageType;
import com.devstagram.domain.dm.repository.DmRepository;
import com.devstagram.domain.dm.repository.DmRoomRepository;
import com.devstagram.domain.dm.repository.DmRoomUserRepository;
import com.devstagram.domain.user.repository.UserRepository;

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

    @InjectMocks
    private DmService dmService;

    @Captor
    private ArgumentCaptor<PageRequest> pageRequestCaptor;

    @Test
    void getMessages_roomNotFound_throws() {
        when(dmRoomRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> dmService.getMessages(null, 1L, null, 15))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getMessages_userNotParticipant_throws() {
        when(dmRoomRepository.existsById(1L)).thenReturn(true);

        when(dmRoomUserRepository.existsByDmRoom_IdAndUser_Id(1L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> dmService.getMessages(1L, 1L, null, 15)).isInstanceOf(IllegalStateException.class);
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
}
