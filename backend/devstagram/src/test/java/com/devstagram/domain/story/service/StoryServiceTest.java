package com.devstagram.domain.story.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.entity.*;
import com.devstagram.domain.story.repository.StoryRepository;
import com.devstagram.domain.story.repository.StoryTagRepository;
import com.devstagram.domain.story.repository.StoryViewedRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.enumtype.MediaType;
import com.devstagram.global.storage.StorageService;

@ExtendWith(MockitoExtension.class)
class StoryServiceTest {

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private StoryTagRepository storyTagRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StoryViewedRepository storyViewedRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private StoryService storyService;

    @Test
    @DisplayName("스토리 생성 성공")
    void createStory_Success() {
        // given
        Long userId = 1L;
        User user = User.builder().nickname("tester").build();
        ReflectionTestUtils.setField(user, "id", userId);

        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "test".getBytes());
        StoryCreateRequest request = StoryCreateRequest.builder()
                .content("테스트 내용")
                .mediaType(MediaType.jpg)
                .file(file)
                .tagUserIds(List.of(2L))
                .thumbnailUrl("thumb_url")
                .build();

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storageService.store(file)).willReturn("saved_file_name.jpg");

        User taggedUser = User.builder().nickname("tagged").build();
        ReflectionTestUtils.setField(taggedUser, "id", 2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(taggedUser));

        given(storyRepository.save(any(Story.class))).willAnswer(invocation -> {
            Story savedStory = invocation.getArgument(0);
            ReflectionTestUtils.setField(savedStory, "id", 10L);
            ReflectionTestUtils.setField(savedStory, "createdAt", LocalDateTime.now());
            ReflectionTestUtils.setField(
                    savedStory, "expiredAt", LocalDateTime.now().plusHours(24));
            return savedStory;
        });

        // when
        StoryCreateResponse response = storyService.createStory(userId, request);

        // then
        assertThat(response.storyId()).isEqualTo(10L);
        assertThat(response.content()).isEqualTo("테스트 내용");
        verify(storageService).store(file);
        verify(storyRepository).save(any(Story.class));
        verify(storyTagRepository).saveAll(any());
        verify(eventPublisher).publishEvent(any(StoryCreatedEvent.class));
    }

    @Test
    @DisplayName("특정 유저 스토리 목록 조회 성공")
    void getUserAllStories_Success() {
        // given
        Long targetUserId = 2L;
        Long currentUserId = 1L;
        User targetUser = User.builder().nickname("target").build();
        ReflectionTestUtils.setField(targetUser, "id", targetUserId);

        StoryMedia media = StoryMedia.builder()
                .sourceUrl("test.jpg")
                .mediaType(MediaType.jpg)
                .build();
        Story story = Story.builder()
                .user(targetUser)
                .content("스토리1")
                .storyMedia(media)
                .build();
        ReflectionTestUtils.setField(story, "id", 10L);
        ReflectionTestUtils.setField(story, "viewers", new ArrayList<>());
        ReflectionTestUtils.setField(story, "tags", new ArrayList<>());
        ReflectionTestUtils.setField(story, "expiredAt", LocalDateTime.now().plusDays(1));

        given(userRepository.findById(targetUserId)).willReturn(Optional.of(targetUser));
        given(storyRepository.findActiveNonExpiredByUserIdOrderByCreatedAtAsc(
                        eq(targetUserId), any(LocalDateTime.class)))
                .willReturn(List.of(story));

        // when
        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, currentUserId);

        // then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).content()).isEqualTo("스토리1");
        assertThat(responses.get(0).mediaUrl()).isEqualTo("/uploads/test.jpg");
    }

    @Test
    @DisplayName("스토리 시청 기록 성공")
    void recordSingleStoryView_Success() {
        // given
        Long storyId = 10L;
        Long currentUserId = 1L;
        Long targetUserId = 2L;

        User currentUser = User.builder().nickname("viewer").build();
        ReflectionTestUtils.setField(currentUser, "id", currentUserId);

        User author = User.builder().nickname("author").build();
        ReflectionTestUtils.setField(author, "id", targetUserId);

        StoryMedia media = StoryMedia.builder()
                .sourceUrl("test.jpg")
                .mediaType(MediaType.jpg)
                .build();
        Story story = Story.builder().user(author).storyMedia(media).build();
        ReflectionTestUtils.setField(story, "id", storyId);
        ReflectionTestUtils.setField(story, "viewers", new ArrayList<>());
        ReflectionTestUtils.setField(story, "tags", new ArrayList<>());
        ReflectionTestUtils.setField(story, "expiredAt", LocalDateTime.now().plusDays(1));

        // findById 결과가 있음 (정상 상황)
        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));
        given(userRepository.findById(currentUserId)).willReturn(Optional.of(currentUser));
        given(storyViewedRepository.findByStoryIdAndUserId(storyId, currentUserId))
                .willReturn(Optional.empty());

        StoryViewed viewed =
                StoryViewed.builder().story(story).user(currentUser).build();
        given(storyViewedRepository.save(any(StoryViewed.class))).willReturn(viewed);

        // when
        StoryDetailResponse response = storyService.recordSingleStoryView(storyId, currentUserId, targetUserId);

        // then
        assertThat(response.storyId()).isEqualTo(storyId);
        verify(storyViewedRepository).save(any(StoryViewed.class));
    }

    @Test
    @DisplayName("좋아요 토글 성공 - 좋아요 추가")
    void patchStoryLike_AddLike() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);

        Story story = Story.builder().build();
        ReflectionTestUtils.setField(story, "id", storyId);

        StoryViewed viewed = StoryViewed.builder().story(story).user(user).build(); // isLiked = false

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));
        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storyViewedRepository.findByStoryIdAndUserId(storyId, userId)).willReturn(Optional.of(viewed));

        // when
        StoryViewResponse response = storyService.patchStoryLike(storyId, userId);

        // then
        assertThat(response.isLiked()).isTrue();
        verify(storyRepository).increaseLikeCount(storyId);
        verify(storyViewedRepository).save(viewed);
    }

    @Test
    @DisplayName("스토리 소프트 딜리트 성공")
    void softDeleteStory_Success() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);
        Story story = spy(Story.builder().user(user).build());
        ReflectionTestUtils.setField(story, "id", storyId);

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));

        // when
        storyService.softDeleteStory(storyId, userId);

        // then
        verify(story).softDelete();
        assertThat(story.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("스토리 하드 딜리트 성공")
    void hardDeleteStory_Success() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);

        StoryMedia media = StoryMedia.builder().sourceUrl("test.jpg").build();
        Story story = Story.builder().user(user).storyMedia(media).build();
        ReflectionTestUtils.setField(story, "id", storyId);

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));

        // when
        storyService.hardDeleteStory(storyId, userId);

        // then
        verify(storageService).delete("test.jpg");
        verify(storyRepository).delete(story);
    }

    @Test
    @DisplayName("아카이브된(만료된) 스토리 목록 조회 성공")
    void getMyArchivedStories_Success() {
        // given
        Long userId = 1L;
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);

        StoryMedia media = StoryMedia.builder()
                .sourceUrl("old.jpg")
                .mediaType(MediaType.jpg)
                .build();
        Story oldStory = Story.builder()
                .user(user)
                .content("옛날 스토리")
                .storyMedia(media)
                .isDeleted(true)
                .build();
        ReflectionTestUtils.setField(oldStory, "id", 20L);
        ReflectionTestUtils.setField(oldStory, "viewers", new ArrayList<>());
        ReflectionTestUtils.setField(oldStory, "tags", new ArrayList<>());

        given(storyRepository.findAllByUserIdAndIsDeletedTrueOrderByCreatedAtDesc(userId))
                .willReturn(List.of(oldStory));

        // when
        List<StoryDetailResponse> responses = storyService.getMyArchivedStories(userId);

        // then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).storyId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("팔로잉 유저들의 스토리 피드 조회 성공")
    void getFollowingStoriesFeed_Success() {
        // given
        Long userId = 1L;
        // 수정: 본인 유저 정보 Mock 추가
        User currentUser = User.builder().nickname("me").build();
        ReflectionTestUtils.setField(currentUser, "id", userId);

        User friend = User.builder().nickname("friend").build();
        ReflectionTestUtils.setField(friend, "id", 2L);

        // 수정: userRepository findById Mock 추가
        given(userRepository.findById(userId)).willReturn(Optional.of(currentUser));

        given(storyRepository.findFolloweesWithActiveStories(eq(userId), any(LocalDateTime.class)))
                .willReturn(List.of(friend));

        // 수정: 본인(Me)에 대한 Repository 호출 Mock 추가
        given(storyRepository.existsUnreadStory(eq(userId), eq(userId), any(LocalDateTime.class)))
                .willReturn(false);
        given(storyRepository.countByUserIdAndIsDeletedFalseAndExpiredAtAfter(eq(userId), any(LocalDateTime.class)))
                .willReturn(1L);
        given(storyRepository.findLastStoryCreatedAt(eq(userId), any(LocalDateTime.class)))
                .willReturn(LocalDateTime.now().minusMinutes(10));

        // 팔로잉 유저에 대한 Mock
        given(storyRepository.existsUnreadStory(eq(2L), eq(userId), any(LocalDateTime.class)))
                .willReturn(true);
        given(storyRepository.countByUserIdAndIsDeletedFalseAndExpiredAtAfter(eq(2L), any(LocalDateTime.class)))
                .willReturn(3L);
        given(storyRepository.findLastStoryCreatedAt(eq(2L), any(LocalDateTime.class)))
                .willReturn(LocalDateTime.now());

        // when
        List<StoryFeedResponse> feed = storyService.getFollowingStoriesFeed(userId);

        // then
        assertThat(feed).hasSize(2);

        assertThat(feed.get(0).isMe()).isTrue();
        assertThat(feed.get(1).nickname()).isEqualTo("friend");
        assertThat(feed.get(1).isUnread()).isTrue();
    }
}
