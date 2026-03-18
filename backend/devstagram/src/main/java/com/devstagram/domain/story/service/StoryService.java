package com.devstagram.domain.story.service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.story.entity.StoryMedia;
import com.devstagram.domain.story.entity.StoryTag;
import com.devstagram.domain.story.entity.StoryViewed;
import com.devstagram.domain.story.repository.StoryRepository;
import com.devstagram.domain.story.repository.StoryTagRepository;
import com.devstagram.domain.story.repository.StoryViewedRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;
    private final StoryTagRepository storyTagRepository;
    private final UserRepository userRepository;
    private final StoryViewedRepository storyViewedRepository;

    @Transactional
    public StoryCreateResponse createStory(Long userId, StoryCreateRequest request) {

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저"));

        StoryMedia media = StoryMedia.builder()
                .mediaType(request.mediaType())
                .sourceUrl(request.storageSource())
                .build();

        Story story = Story.builder()
                .user(user)
                .content(request.content())
                .thumbnailUrl(request.thumbnailUrl())
                .storyMedia(media)
                .build();

        Story savedStory = storyRepository.save(story);

        if (request.tagUserIds() != null) { // 태그된 유저 존재하는지 검증 & storyTag 생성
            List<StoryTag> tags = request.tagUserIds().stream()
                    .map(targetUserId -> {
                        User targetUser = userRepository
                                .findById(targetUserId)
                                .orElseThrow(() -> new ServiceException("404", "태그된 사용자를 찾을 수 없음"));

                        return StoryTag.builder()
                                .story(savedStory)
                                .target(targetUser)
                                .build();
                    })
                    .toList();

            storyTagRepository.saveAll(tags);
        }

        return StoryCreateResponse.builder()
                .storyId(story.getId())
                .userId(story.getUser().getId())
                .createdAt(story.getCreatedAt())
                .expiredAt(story.getExpiredAt())
                .content(story.getContent())
                .tagedUserIds(request.tagUserIds())
                .build();
    }

    @Transactional
    public List<StoryDetailResponse> getUserAllStories(Long targetUserId, Long currentUserId) {

        userRepository.findById(targetUserId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저."));

        List<Story> stories = storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(targetUserId);

        Set<Long> likedStoryIds = getLikedStoryIds(currentUserId, stories);

        return stories.stream()
                .map(story -> {
                    recordingStoryView(story, currentUserId); // storyView 생성

                    return StoryDetailResponse.builder()
                            .storyId(story.getId())
                            .userId(story.getUser().getId())
                            .createdAt(story.getCreatedAt())
                            .expiredAt(story.getExpiredAt())
                            .content(story.getContent())
                            .totalLikeCount(story.getLikeCount())
                            .isLiked(likedStoryIds.contains(story.getId()))
                            .tagedUserIds(story.getTags().stream()
                                    .map(tag -> tag.getTarget().getId())
                                    .toList())
                            .build();
                })
                .toList();
    }

    @Transactional
    public void softDeleteStory(Long storyId, Long userId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ServiceException("403", "본인 스토리만 삭제 가능");
        }

        if (story.isDeleted()) {
            throw new ServiceException("404", "만료된 스토리.");
        } else {
            story.softDelete();
        }
    }

    @Transactional
    public void hardDeleteStory(Long storyId, Long userId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ServiceException("403", "본인 스토리만 삭제 가능");
        }

        storyRepository.delete(story);
    }

    @Transactional
    public StoryViewResponse patchStoryLike(Long storyId, Long userId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리."));

        if (story.isDeleted()) {
            throw new ServiceException("404", "만료/삭제된 스토리.");
        }

        recordingStoryView(story, userId); // 조회 기록 없으면 생성

        StoryViewed storyViewed = storyViewedRepository
                .findByStoryIdAndUserId(storyId, userId)
                .orElseThrow(() -> new ServiceException("500", "조회 기록 갱신 실패"));

        storyViewed.updateLike(); // 스토리의 좋아요 갱신

        return StoryViewResponse.from(storyViewed);
    }

    // 조회 기록 StoryView 생성/갱신
    private void recordingStoryView(Story story, Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!storyViewedRepository.existsByStoryAndUser(story, user)) {
                storyViewedRepository.save(
                        StoryViewed.builder().story(story).user(user).build());
            }
        });
    }

    // 스토리 목록 중에서 유저가 좋아요 누른 스토리 ID set 반환
    private Set<Long> getLikedStoryIds(Long userId, List<Story> stories) {
        if (stories.isEmpty()) {
            return Collections.emptySet();
        }

        List<Long> storyIds = stories.stream().map(Story::getId).toList();

        return storyViewedRepository.findByUserIdAndStoryIdIn(userId, storyIds).stream()
                .filter(StoryViewed::isLiked)
                .map(viewed -> viewed.getStory().getId())
                .collect(Collectors.toSet());
    }

    // 스토리 본 유저들 조회
    @Transactional(readOnly = true)
    public List<StoryViewerUserResponse> getStoryViewers(Long storyId, Long currentUserId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new ServiceException("403", "본인만 확인 가능");
        }

        List<StoryViewed> viewers = storyViewedRepository.findByStoryIdOrderByViewedAtDesc(storyId);

        return viewers.stream().map(StoryViewerUserResponse::from).toList();
    }

    // 스토리 좋아요 누른 유저들 조회
    @Transactional(readOnly = true)
    public List<StoryViewerUserResponse> getStoryLiker(Long storyId, Long currentUserId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new ServiceException("403", "본인만 확인 가능");
        }

        List<StoryViewed> likers = storyViewedRepository.findByStoryIdAndIsLikedTrueOrderByLikedAtDesc(storyId);

        return likers.stream().map(StoryViewerUserResponse::from).toList();
    }

    // 내 만료된 스토리 목록 조회
    @Transactional(readOnly = true)
    public List<StoryDetailResponse> getMyArchivedStories(Long currentUserId) {

        // isDeleted = true인 스토리 목록 조회 -> id들만 뽑아옴
        List<Story> stories = storyRepository.findAllByUserIdAndIsDeletedTrueOrderByCreatedAtDesc(currentUserId);
        Set<Long> likedStoryIds = getLikedStoryIds(currentUserId, stories);

        return stories.stream()
                .map(story -> StoryDetailResponse.builder()
                        .storyId(story.getId())
                        .userId(story.getUser().getId())
                        .createdAt(story.getCreatedAt())
                        .expiredAt(story.getExpiredAt())
                        .content(story.getContent())
                        .totalLikeCount(story.getLikeCount())
                        .isLiked(likedStoryIds.contains(story.getId()))
                        .tagedUserIds(story.getTags().stream()
                                .map(tag -> tag.getTarget().getId())
                                .toList())
                        .build())
                .toList();
    }
}
