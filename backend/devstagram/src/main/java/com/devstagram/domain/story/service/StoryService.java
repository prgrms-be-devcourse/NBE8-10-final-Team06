package com.devstagram.domain.story.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.devstagram.domain.story.dto.StoryCreateRequest;
import com.devstagram.domain.story.dto.StoryCreateResponse;
import com.devstagram.domain.story.dto.StoryDetailResponse;
import com.devstagram.domain.story.dto.StoryLikeResponse;
import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.story.entity.StoryMedia;
import com.devstagram.domain.story.entity.StoryTag;
import com.devstagram.domain.story.repository.StoryRepository;
import com.devstagram.domain.story.repository.StoryTagRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;
    private final StoryTagRepository storyTagRepository;
    private final UserRepository userRepository;

    @Transactional
    public StoryCreateResponse createStory(Long userId, StoryCreateRequest request) {

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저"));

        StoryMedia media = StoryMedia.builder()
                .mediaType(request.getMediaType())
                .sourceUrl(request.getStorageSource())
                .build();

        Story story = Story.builder()
                .user(user)
                .content(request.getContent())
                .thumbnailUrl(request.getThumbnailUrl())
                .storyMedia(media)
                .build();

        Story savedStory = storyRepository.save(story);

        if (request.getTagUserIds() != null) { // 태그된 유저 존재하는지 검증 & storyTag 생성
            List<StoryTag> tags = request.getTagUserIds().stream()
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
                .tagedUserIds(request.getTagUserIds())
                .build();
    }

    @Transactional
    public List<StoryDetailResponse> getUserAllStories(Long targetUserId, Long currentUserId) {

        userRepository.findById(targetUserId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저."));

        List<Story> stories = storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(targetUserId);

        return stories.stream()
                // 리스트의 모든 스토리에 대해 만료 시간 체크
                .peek(Story::checkExpired)
                .filter(story -> !story.isDeleted()) // 만료 안된 스토리만 필터링
                .map(story -> StoryDetailResponse.builder()
                        .storyId(story.getId())
                        .userId(story.getUser().getId())
                        .createdAt(story.getCreatedAt())
                        .expiredAt(story.getExpiredAt())
                        .content(story.getContent())
                        .totalLikeCount((long) story.getLikeCount())
                        .isLiked(story.getLikes().stream()
                                .anyMatch(u -> u.getId().equals(currentUserId)))
                        .tagedUserIds(story.getTags().stream()
                                .map(tag -> tag.getTarget().getId())
                                .toList())
                        .build())
                .toList();
    }

    @Transactional
    public void softDeleteStory(Long storyId, Long userId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ServiceException("403", "본인 스토리만 삭제 가능");
        }

        story.checkExpired();
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
    public StoryLikeResponse patchStoryLike(Long storyId, Long userId) {

        Story story = storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 스토리."));

        story.checkExpired();
        if (story.isDeleted()) {
            throw new ServiceException("404", "만료/삭제된 스토리.");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저"));
        boolean currentLikeStatus = story.patchLike(user);

        return StoryLikeResponse.builder()
                .storyId(story.getId())
                .totalLikeCount((long) story.getLikeCount())
                .isLiked(currentLikeStatus)
                .build();
    }
}
