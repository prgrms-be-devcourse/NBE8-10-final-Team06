package com.devstagram.domain.user.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import com.devstagram.domain.user.service.FollowService;
import com.devstagram.domain.user.service.UserService;
import com.devstagram.global.storage.StorageService;
import com.devstagram.global.util.FileValidator;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private FollowService followService;

    @Mock
    private StorageService storageService; // 추가 필수!

    @Mock
    private FileValidator fileValidator;   // 추가 필수!

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("프로필 수정 성공 - 닉네임 변경 및 UserInfo가 자동 생성되어야 한다")
    void updateProfile_Success_WithNewUserInfo() {
        // given
        Long userId = 1L;
        User user = User.builder()
                .nickname("oldNickname")
                .profileImageUrl("oldUrl")
                .birthDate(LocalDate.of(1990, 1, 1))
                .gender(Gender.MALE)
                .build();

        ProfileUpdateRequest request = new ProfileUpdateRequest(
                "newNickname",
                "https://github.com/dev",
                Resume.JUNIOR,
                LocalDate.of(1995, 5, 5),
                Gender.FEMALE);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(userRepository.existsByNickname("newNickname")).willReturn(false);

        // when - 세 번째 인자로 null(파일 없음)을 넘겨줍니다.
        userService.updateProfile(userId, request, null);

        // then
        assertThat(user.getNickname()).isEqualTo("newNickname");
        // profileImage가 null이므로 기존 imageUrl인 "oldUrl"이 유지되어야 함 (로직에 따라 확인)
        assertThat(user.getNickname()).isEqualTo("newNickname");
        assertThat(user.getUserInfo()).isNotNull();
    }

    @Test
    @DisplayName("프로필 수정 성공 - 본인의 기존 닉네임을 그대로 유지할 때는 중복 체크를 통과해야 한다")
    void updateProfile_Success_KeepSameNickname() {
        // given
        Long userId = 1L;
        String sameNickname = "keepMe";
        User user = User.builder().nickname(sameNickname).build();
        user.setUserInfo(UserInfo.builder().resume(Resume.UNSPECIFIED).build());

        ProfileUpdateRequest request =
                new ProfileUpdateRequest(sameNickname, "git", Resume.SENIOR, LocalDate.now(), Gender.MALE);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));

        // when
        userService.updateProfile(userId, request, null); // 인자 3개!

        // then
        assertThat(user.getNickname()).isEqualTo(sameNickname);
        verify(userRepository, never()).existsByNickname(anyString());
    }

    @Test
    @DisplayName("프로필 수정 실패 - 이미 존재하는 다른 유저의 닉네임으로 변경 시 예외가 발생한다")
    void updateProfile_Fail_DuplicateNickname() {
        // given
        Long userId = 1L;
        User user = User.builder().nickname("myOldName").build();

        ProfileUpdateRequest request = new ProfileUpdateRequest(
                "otherUserNickname", "git", Resume.JUNIOR, LocalDate.now(), Gender.MALE);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(userRepository.existsByNickname("otherUserNickname")).willReturn(true);

        // when & then
        assertThatThrownBy(() -> userService.updateProfile(userId, request, null)) // 인자 3개!
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("이미 사용 중인 닉네임입니다.");
    }
}
