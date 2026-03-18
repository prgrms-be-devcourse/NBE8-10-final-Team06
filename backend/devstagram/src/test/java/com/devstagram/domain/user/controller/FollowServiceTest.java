package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.FollowService;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @InjectMocks
    private FollowService followService;

    @Mock
    private FollowRepository followRepository;
    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("팔로우 성공")
    void follow_success() {
        // given
        User fromUser = User.builder().id(1L).nickname("나").build();
        User toUser = User.builder().id(2L).nickname("상대방").build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(fromUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(toUser));
        when(followRepository.existsByFromUserAndToUser(fromUser, toUser)).thenReturn(false);

        // when
        followService.follow(1L, 2L);

        // then
        verify(followRepository, times(1)).save(any(Follow.class));
    }

    @Test
    @DisplayName("자기 자신 팔로우 시 예외 발생")
    void follow_self_fail() {
        // when & then
        ServiceException exception = assertThrows(ServiceException.class, () -> {
            followService.follow(1L, 1L);
        });
        assertEquals("400-F-1", exception.getResultCode());
    }

    @Test
    @DisplayName("이미 팔로우 중인 경우 예외 발생")
    void follow_already_exists() {
        // given
        User fromUser = User.builder().id(1L).build();
        User toUser = User.builder().id(2L).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(fromUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(toUser));
        when(followRepository.existsByFromUserAndToUser(fromUser, toUser)).thenReturn(true);

        // when & then
        assertThrows(ServiceException.class, () -> followService.follow(1L, 2L));
    }
}
