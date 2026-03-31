package com.devstagram.domain.user.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.dto.UserSearchResponse;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
import com.devstagram.domain.user.event.UserWithdrawnEvent;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.storage.StorageService;
import com.devstagram.global.util.FileValidator;

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

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PostRepository postRepository;

    @Mock
    private TechnologyRepository technologyRepository;

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

        // when
        userService.updateProfile(userId, request, null);

        // then
        assertThat(user.getNickname()).isEqualTo("newNickname");
        assertThat(user.getUserInfo()).isNotNull();
    }

    @Test
    @DisplayName("프로필 수정 성공 - 이미지가 있을 때 스토리지 서비스가 호출되어야 한다")
    void updateProfile_WithImage() {
        // given
        Long userId = 1L;
        User user = User.builder()
                .nickname("oldName")
                .profileImageUrl("old-image.png")
                .build();

        ProfileUpdateRequest request = new ProfileUpdateRequest(
                "newName", "https://github.com/dohwa", Resume.JUNIOR, LocalDate.now(), Gender.MALE);

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "profileImage", "test.png", "image/png", "test".getBytes());

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storageService.store(file)).willReturn("https://new-image-url.com");
        given(userRepository.existsByNickname("newName")).willReturn(false);

        // when
        userService.updateProfile(userId, request, file);

        // then
        verify(fileValidator).validateImage(file);
        verify(storageService).store(file);
        verify(storageService).delete("old-image.png");

        assertThat(user.getProfileImageUrl()).isEqualTo("https://new-image-url.com");
        assertThat(user.getNickname()).isEqualTo("newName");
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
        userService.updateProfile(userId, request, null);

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
        assertThatThrownBy(() -> userService.updateProfile(userId, request, null))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("이미 사용 중인 닉네임입니다.");
    }

    @Test
    @DisplayName("유저 검색 성공 - 검색 키워드와 페이징을 이용해 Slice 형태의 결과를 반환한다")
    void searchUsers_Success() {
        // given
        String keyword = "dohwa";
        Long currentUserId = 1L;
        Pageable pageable = PageRequest.of(0, 20);

        User user1 = User.builder()
                .nickname("dohwa_backend")
                .profileImageUrl("https://image1.com")
                .build();
        ReflectionTestUtils.setField(user1, "id", 1L);

        User user2 = User.builder().nickname("dohwa_ai").build();
        ReflectionTestUtils.setField(user2, "id", 2L);

        List<User> userList = Arrays.asList(user1, user2);

        given(userRepository.findByNicknameContaining(anyString(), any(Pageable.class)))
                .willReturn(new SliceImpl<>(userList, pageable, false));

        // when
        Slice<UserSearchResponse> results = userService.searchUsers(keyword, currentUserId, pageable);

        // then
        assertThat(results.getContent()).hasSize(2);
        assertThat(results.getContent().get(0).nickname()).isEqualTo("dohwa_backend");
        assertThat(results.getContent().get(1).nickname()).isEqualTo("dohwa_ai");

        verify(userRepository, times(1)).findByNicknameContaining(eq(keyword), any(Pageable.class));
    }

    @Test
    @DisplayName("유저 검색 - 검색어가 공백이면 리포지토리를 호출하지 않고 빈 Slice를 반환한다")
    void searchUsers_EmptyKeyword() {
        // given
        String keyword = "  ";
        Long currentUserId = 1L;
        Pageable pageable = PageRequest.of(0, 20);

        // when
        Slice<UserSearchResponse> results = userService.searchUsers(keyword, currentUserId, pageable);

        // then
        assertThat(results.getContent()).isEmpty();
        verify(userRepository, never()).findByNicknameContaining(anyString(), any(Pageable.class));
    }

    @Test
    @DisplayName("회원 탈퇴 성공 - 유저 상태가 변경되고 이벤트가 발행되어야 한다")
    void withdraw_Success() {
        // given
        Long userId = 1L;
        User user = User.builder()
                .nickname("dohwa")
                .email("dohwa@test.com")
                .isDeleted(false)
                .build();
        ReflectionTestUtils.setField(user, "id", userId);

        given(userRepository.findById(userId)).willReturn(Optional.of(user));

        // when
        userService.withdraw(userId);

        // then
        assertThat(user.isDeleted()).isTrue();
        assertThat(user.getNickname()).contains("탈퇴한 사용자");
        verify(eventPublisher, times(1)).publishEvent(any(UserWithdrawnEvent.class));
    }

    @Test
    @DisplayName("유저 프로필 조회 성공 - 기술 벡터 기반 상위 기술과 게시글 목록을 포함한 응답을 반환한다")
    void getUserProfile_Success() {
        // given
        String nickname = "dohwa";
        Long currentUserId = 1L;
        Pageable pageable = PageRequest.of(0, 10);

        User targetUser = User.builder()
                .nickname(nickname)
                .followerCount(10L)
                .followingCount(20L)
                .postCount(5L)
                .build();
        ReflectionTestUtils.setField(targetUser, "id", 2L);

        // 벡터 기반 점수를 직접 반영한다.
        // 현재 User 엔티티는 technologyId = index + 1 규칙으로 techVector를 관리한다.
        targetUser.updateTechScore(1, 65);
        targetUser.updateTechScore(2, 40);

        TechCategory backendCategory = TechCategory.builder().name("Backend").build();

        Technology javaTechnology = Technology.builder()
                .name("Java")
                .color("#007396")
                .category(backendCategory)
                .build();
        ReflectionTestUtils.setField(javaTechnology, "id", 1L);

        Technology springBootTechnology = Technology.builder()
                .name("Spring Boot")
                .color("#6DB33F")
                .category(backendCategory)
                .build();
        ReflectionTestUtils.setField(springBootTechnology, "id", 2L);

        // 유저 조회 모킹
        given(userRepository.findByNicknameWithInfo(nickname)).willReturn(Optional.of(targetUser));

        // 팔로우 여부 모킹
        given(followService.isFollowing(currentUserId, targetUser.getId())).willReturn(true);

        // 게시글 목록 모킹
        given(postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(
                        eq(targetUser.getId()), any(Pageable.class)))
                .willReturn(new SliceImpl<>(Collections.emptyList(), pageable, false));

        // 상위 기술 ID로 Technology 엔티티를 조회하는 부분 모킹
        given(technologyRepository.findAllByIdsWithCategory(anyList()))
                .willReturn(List.of(javaTechnology, springBootTechnology));

        // when
        UserProfileResponse response = userService.getUserProfile(nickname, currentUserId, pageable);

        // then
        assertThat(response.nickname()).isEqualTo(nickname);
        assertThat(response.followerCount()).isEqualTo(10L);
        assertThat(response.followingCount()).isEqualTo(20L);
        assertThat(response.postCount()).isEqualTo(5L);
        assertThat(response.isFollowing()).isTrue();

        // 벡터 기반으로 계산된 상위 기술 점수 검증
        assertThat(response.topTechScores()).hasSize(2);
        assertThat(response.topTechScores().get(0).techName()).isEqualTo("Java");
        assertThat(response.topTechScores().get(0).score()).isEqualTo(65);
        assertThat(response.topTechScores().get(1).techName()).isEqualTo("Spring Boot");
        assertThat(response.topTechScores().get(1).score()).isEqualTo(40);

        verify(userRepository).findByNicknameWithInfo(nickname);
        verify(followService).isFollowing(currentUserId, targetUser.getId());
        verify(postRepository)
                .findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(eq(targetUser.getId()), any(Pageable.class));
        verify(technologyRepository).findAllByIdsWithCategory(anyList());
    }
}
