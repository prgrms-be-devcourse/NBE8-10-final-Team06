package com.devstagram.domain.story.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

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
import com.devstagram.global.exception.ServiceException;
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
                .build();

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storageService.store(file)).willReturn("saved_file_name.jpg");

        User taggedUser = User.builder().nickname("tagged").build();
        ReflectionTestUtils.setField(taggedUser, "id", 2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(taggedUser));

        given(storyRepository.save(any(Story.class))).willAnswer(invocation -> {
            Story s = invocation.getArgument(0);
            ReflectionTestUtils.setField(s, "id", 10L);
            return s;
        });

        // when
        StoryCreateResponse response = storyService.createStory(userId, request);

        // then
        assertThat(response.storyId()).isEqualTo(10L);
        verify(storageService).store(file);
        verify(storyRepository).save(any(Story.class));
        verify(storyTagRepository).saveAll(any());
        verify(eventPublisher).publishEvent(any(StoryCreatedEvent.class));
    }

    @Test
    @DisplayName("스토리 생성 실패 - 존재하지 않는 유저")
    void createStory_Fail_UserNotFound() {
        // given
        Long userId = 1L;
        StoryCreateRequest request = StoryCreateRequest.builder().build();
        given(userRepository.findById(userId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> storyService.createStory(userId, request))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("존재하지 않는 유저");
    }

    @Test
    @DisplayName("특정 유저 스토리 목록 조회 성공")
    void getUserAllStories_Success() {
        // given
        Long targetUserId = 2L;
        Long currentUserId = 1L;
        User targetUser = User.builder().build();
        ReflectionTestUtils.setField(targetUser, "id", targetUserId);

        Story story = Story.builder().user(targetUser).content("스토리1").build();
        ReflectionTestUtils.setField(story, "id", 10L);

        given(userRepository.findById(targetUserId)).willReturn(Optional.of(targetUser));
        given(storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(targetUserId))
                .willReturn(List.of(story));

        // when
        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, currentUserId);

        // then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).content()).isEqualTo("스토리1");
    }

    @Test
    @DisplayName("스토리 시청 기록 성공")
    void recordSingleStoryView_Success() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);

        User author = User.builder().build();
        ReflectionTestUtils.setField(author, "id", 2L);
        Story story = Story.builder().user(author).build();
        ReflectionTestUtils.setField(story, "id", storyId);

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));
        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storyViewedRepository.findByStoryIdAndUserId(storyId, userId)).willReturn(Optional.empty());

        StoryViewed viewed = StoryViewed.builder().story(story).user(user).build();
        given(storyViewedRepository.save(any(StoryViewed.class))).willReturn(viewed);

        // when
        StoryDetailResponse response = storyService.recordSingleStoryView(storyId, userId);

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
        Story story = Story.builder().build();
        ReflectionTestUtils.setField(story, "id", storyId);
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);
        StoryViewed viewed = StoryViewed.builder().story(story).user(user).build(); // isLiked = false

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));
        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storyViewedRepository.findByStoryIdAndUserId(storyId, userId)).willReturn(Optional.of(viewed));

        // when
        StoryViewResponse response = storyService.patchStoryLike(storyId, userId);

        // then
        assertThat(response.isLiked()).isTrue();
        verify(storyRepository).increaseLikeCount(storyId);
    }

    @Test
    @DisplayName("좋아요 토글 성공 - 좋아요 취소")
    void patchStoryLike_RemoveLike() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        Story story = Story.builder().build();
        ReflectionTestUtils.setField(story, "id", storyId);
        User user = User.builder().build();
        ReflectionTestUtils.setField(user, "id", userId);
        StoryViewed viewed = StoryViewed.builder().story(story).user(user).build();
        viewed.like(); // 먼저 좋아요 상태로 만듦

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));
        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(storyViewedRepository.findByStoryIdAndUserId(storyId, userId)).willReturn(Optional.of(viewed));

        // when
        StoryViewResponse response = storyService.patchStoryLike(storyId, userId);

        // then
        assertThat(response.isLiked()).isFalse();
        verify(storyRepository).decreaseLikeCount(storyId);
    }

    @Test
    @DisplayName("스토리 삭제 성공")
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
    }

    @Test
    @DisplayName("스토리 삭제 실패 - 권한 없음")
    void softDeleteStory_Fail_Forbidden() {
        // given
        Long storyId = 10L;
        Long userId = 1L;
        Long authorId = 2L;
        User author = User.builder().build();
        ReflectionTestUtils.setField(author, "id", authorId);
        Story story = Story.builder().user(author).build();
        ReflectionTestUtils.setField(story, "id", storyId);

        given(storyRepository.findById(storyId)).willReturn(Optional.of(story));

        // when & then
        assertThatThrownBy(() -> storyService.softDeleteStory(storyId, userId))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("본인 스토리만 삭제 가능");
    }
}
