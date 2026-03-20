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

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저"));

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
                                .orElseThrow(() -> new ServiceException("404-F-2", "태그된 사용자를 찾을 수 없음"));

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
                .taggedUserIds(request.tagUserIds())
                .build();
    }

    // 특정 유저가 올린 스토리 목록 가져옴
    @Transactional(readOnly = true)
    public List<StoryDetailResponse> getUserAllStories(Long targetUserId, Long currentUserId) {

        userRepository.findById(targetUserId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저."));

        boolean isAuthor = targetUserId.equals(currentUserId);
        // 조회자가 스토리 보유자와 동일인인지 : 좋아요 개수 노출 여부 결정하기 위함

        List<Story> stories = storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(targetUserId);
        // 특정 유저의 스토리 & 활성화된 스토리 찾아서 생성 시간순으로 정렬

        if (stories.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> storyIds = stories.stream().map(Story::getId).toList(); // 위에서 받아온 스토리들의 아이디만 리스트로 받아옴
        List<StoryViewed> existingViews = storyViewedRepository.findByUserIdAndStoryIdIn(currentUserId, storyIds);
        // 받아온 스토리들의 스토리 뷰들을 찾아 리스트로 만듦

        Set<Long> likedStoryIds = existingViews.stream()
                .filter(StoryViewed::isLiked)
                // StoryViewed 들 중에서 isLiked = true <=> 현재 사용자가 좋아요 누른 것들만 필터링
                .map(v -> v.getStory().getId())
                // 좋아요 누른 스토리 아이디만 추출해서 Set으로 담음
                .collect(Collectors.toSet());

        // 이 유저의 활성화된 스토리를 전부 순회
        return stories.stream()
                .map(story -> toDetailResponse(story, currentUserId, likedStoryIds.contains(story.getId())))
                .toList();
    }

    // 스토리 단건 조회(StoryViewed 생성)
    @Transactional
    public StoryDetailResponse recordSingleStoryView(Long storyId, Long currentUserId) {

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리"));

        if (story.isDeleted()) {
            throw new ServiceException("404-F-2", "만료된 스토리");
        }

        User currentUser =
                userRepository.findById(currentUserId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저"));

        StoryViewed storyViewed = createStoryViewed(story, currentUser);
        // 조회 기록 처리

        return toDetailResponse(story, currentUserId, storyViewed.isLiked());
    }

    @Transactional
    public void softDeleteStory(Long storyId, Long userId) {

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ServiceException("403-F-1", "본인 스토리만 삭제 가능");
        }

        if (story.isDeleted()) {
            throw new ServiceException("404-F-2", "만료된 스토리.");
        } else {
            story.softDelete();
        }
    }

    @Transactional
    public void hardDeleteStory(Long storyId, Long userId) {

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ServiceException("403-F-1", "본인 스토리만 삭제 가능");
        }

        storyRepository.delete(story);
    }

    // 스토리 좋아요 갱신
    @Transactional
    public StoryViewResponse patchStoryLike(Long storyId, Long userId) {

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리."));

        if (story.isDeleted()) {
            throw new ServiceException("404-F-2", "만료/삭제된 스토리");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저"));

        createStoryViewed(story, user); // 조회 기록 없으면 생성

        StoryViewed storyViewed = storyViewedRepository
                .findByStoryIdAndUserId(storyId, userId)
                .orElseThrow(() -> new ServiceException("500-F-1", "조회 기록 갱신 실패"));

        storyViewed.updateLike(); // 스토리의 좋아요 갱신

        return StoryViewResponse.from(storyViewed);
    }

    // 조회 기록 있으면 가져오고, 아니면 새로 StoryView 생성
    private StoryViewed createStoryViewed(Story story, User user) {
        return storyViewedRepository
                .findByStoryIdAndUserId(story.getId(), user.getId())
                .orElseGet(() -> storyViewedRepository.save(
                        StoryViewed.builder().story(story).user(user).build()));
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

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new ServiceException("403-F-1", "본인만 확인 가능");
        }

        List<StoryViewed> viewers = storyViewedRepository.findByStoryIdOrderByViewedAtDesc(storyId);

        return viewers.stream().map(StoryViewerUserResponse::from).toList();
    }

    // 스토리 좋아요 누른 유저들 조회
    @Transactional(readOnly = true)
    public List<StoryViewerUserResponse> getStoryLiker(Long storyId, Long currentUserId) {

        Story story =
                storyRepository.findById(storyId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 스토리"));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new ServiceException("403-F-1", "본인만 확인 가능");
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
                .map(story -> toDetailResponse(story, currentUserId, likedStoryIds.contains(story.getId())))
                .toList();
    }

    private StoryDetailResponse toDetailResponse(Story story, Long currentUserId, boolean isLiked) {

        boolean isAuthor = story.getUser().getId().equals(currentUserId);
        // 조회자가 스토리 보유자와 동일인인지 : 좋아요 개수 노출 여부 결정하기 위함

        List<StoryViewerUserResponse> viewers = null;
        List<StoryViewerUserResponse> likers = null;

        if (isAuthor) {
            // 스토리 시청자들
            viewers = story.getViewers().stream()
                    .map(StoryViewerUserResponse::from)
                    .toList();

            // 조회 기록 중 좋아요를 누른 사람만 필터링
            likers = story.getViewers().stream()
                    .filter(StoryViewed::isLiked)
                    .map(StoryViewerUserResponse::from)
                    .toList();
        }

        return StoryDetailResponse.builder()
                .storyId(story.getId())
                .userId(story.getUser().getId())
                .content(story.getContent())
                .createdAt(story.getCreatedAt())
                .expiredAt(story.getExpiredAt())
                .totalLikeCount(isAuthor ? story.getLikeCount() : -1)
                // ㄴ 현재 조회자가 작성자면 정상 갯수 반환, 작성자가 아니면 무조건 좋아요 갯수 -1 반환

                .isLiked(isLiked) // 좋아요 눌렀는지 여부
                .tagedUserIds(story.getTags().stream()
                        .map(tag -> tag.getTarget().getId())
                        .toList())
                .viewers(viewers)
                .likers(likers)
                // 작성자일 때만 채워진 리스트가 나가고, 작성자 본인 아니면 null로
                .build();
    }
}
