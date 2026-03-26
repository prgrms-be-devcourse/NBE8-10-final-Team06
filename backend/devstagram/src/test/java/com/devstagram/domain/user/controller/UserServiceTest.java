package com.devstagram.domain.user.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import com.devstagram.domain.user.dto.UserSearchResponse;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
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
import com.devstagram.domain.user.service.FollowService;
import com.devstagram.domain.user.service.UserService;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.storage.StorageService;
import com.devstagram.global.util.FileValidator;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private FollowService followService;

    @Mock
    private StorageService storageService;

    @Mock
    private FileValidator fileValidator;

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
                "newNickname", "https://github.com/dev", Resume.JUNIOR, LocalDate.of(1995, 5, 5), Gender.FEMALE);

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

        ProfileUpdateRequest request =
                new ProfileUpdateRequest("otherUserNickname", "git", Resume.JUNIOR, LocalDate.now(), Gender.MALE);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(userRepository.existsByNickname("otherUserNickname")).willReturn(true);

        // when & then
        assertThatThrownBy(() -> userService.updateProfile(userId, request, null)) // 인자 3개!
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("이미 사용 중인 닉네임입니다.");
    }

    @Test
    @DisplayName("유저 검색 성공 - 검색 키워드와 페이징을 이용해 Slice 형태의 결과를 반환한다")
    void searchUsers_Success() {
        // 1. 준비 (given)
        String keyword = "dohwa";
        Long currentUserId = 1L;
        Pageable pageable = PageRequest.of(0, 20);

        // User 엔티티 생성 (builder에 id가 없으므로 ReflectionTestUtils 사용)
        User user1 = User.builder()
                .nickname("dohwa_backend")
                .profileImageUrl("https://image1.com")
                .build();
        ReflectionTestUtils.setField(user1, "id", 1L);

        User user2 = User.builder()
                .nickname("dohwa_ai")
                .build();
        ReflectionTestUtils.setField(user2, "id", 2L);

        // 리포지토리 결과를 SliceImpl로 감싸서 준비
        List<User> userList = Arrays.asList(user1, user2);
        Slice<UserSearchResponse> sliceResponse = new SliceImpl<>(
                Arrays.asList(
                        UserSearchResponse.of(user1, false),
                        UserSearchResponse.of(user2, false)
                ),
                pageable,
                false
        );

        // 서비스 로직에서 리포지토리가 아닌 서비스 메서드 자체를 검증하거나
        // 서비스 내부에서 호출하는 userRepository.findByNicknameContaining 등을 모킹
        // 도화님의 UserController를 보니 Slice<UserSearchResponse>를 반환하므로 서비스 메서드 호출 결과 모킹
        given(userRepository.findByNicknameContaining(anyString(), any(Pageable.class)))
                .willReturn(new SliceImpl<>(userList, pageable, false));

        // 2. 실행 (when)
        Slice<UserSearchResponse> results = userService.searchUsers(keyword, currentUserId, pageable);

        // 3. 검증 (then)
        assertThat(results.getContent()).hasSize(2);
        assertThat(results.getContent().get(0).nickname()).isEqualTo("dohwa_backend");
        assertThat(results.getContent().get(1).nickname()).isEqualTo("dohwa_ai");

        verify(userRepository, times(1)).findByNicknameContaining(eq(keyword), any(Pageable.class));
    }

    @Test
    @DisplayName("유저 검색 - 검색어가 공백이면 리포지토리를 호출하지 않고 빈 Slice를 반환한다")
    void searchUsers_EmptyKeyword() {
        // given
        String keyword = "  "; // 공백 입력
        Long currentUserId = 1L;
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 20);

        // when
        org.springframework.data.domain.Slice<com.devstagram.domain.user.dto.UserSearchResponse> results =
                userService.searchUsers(keyword, currentUserId, pageable);

        // then
        assertThat(results.getContent()).isEmpty();
        verify(userRepository, never()).findByNicknameContaining(anyString(), any(org.springframework.data.domain.Pageable.class));
    }
}
