package com.devstagram.domain.story.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.dto.StoryCreatedEvent;
import com.devstagram.domain.story.entity.*;
import com.devstagram.domain.story.repository.StoryRepository;
import com.devstagram.domain.story.repository.StoryTagRepository;
import com.devstagram.domain.story.repository.StoryViewedRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.storage.StorageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;
    private final StoryTagRepository storyTagRepository;
    private final UserRepository userRepository;
    private final StoryViewedRepository storyViewedRepository;
    private final StorageService storageService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public StoryCreateResponse createStory(Long userId, StoryCreateRequest request) {

        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저"));

        // 미디어 파일 로컬 저장
        String savedFileName = storageService.store(request.file());

        // StoryMedia 엔티티 생성 & 그 안에 파일몀 넣어놓기
        StoryMedia media = StoryMedia.builder()
                .mediaType(request.mediaType())
                .sourceUrl(savedFileName)
                .build();
        // StoryMedia 생성

        Story story = Story.builder()
                .user(user)
                .content(request.content())
                .thumbnailUrl(request.thumbnailUrl())
                .storyMedia(media)
                .build();
        // 스토리 생성

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

        // 스토리 생성 이벤트 발행 (태그 알림 DM 전송 처리를 위함)
        eventPublisher.publishEvent(new StoryCreatedEvent(savedStory, request.tagUserIds(), userId));

        return StoryCreateResponse.builder()
                .storyId(savedStory.getId())
                .userId(savedStory.getUser().getId())
                .createdAt(savedStory.getCreatedAt())
                .expiredAt(savedStory.getExpiredAt())
                .content(savedStory.getContent())
                .taggedUserIds(request.tagUserIds())
                .build();
    }

    // 특정 유저가 올린 스토리 목록 가져옴
    @Transactional(readOnly = true)
    public List<StoryDetailResponse> getUserAllStories(Long targetUserId, Long currentUserId) {

        userRepository.findById(targetUserId).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 유저."));

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

        // 하드 딜리트 시 미디어 파일도 같이 삭제
        if (story.getStoryMedia() != null && story.getStoryMedia().getSourceUrl() != null) {
            storageService.delete(story.getStoryMedia().getSourceUrl());
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

        if (storyViewed.isLiked()) {
            storyViewed.unlike();
            storyRepository.decreaseLikeCount(storyId);
        } else {
            storyViewed.like();
            storyRepository.increaseLikeCount(storyId);
        }
        storyViewedRepository.save(storyViewed);

        return StoryViewResponse.from(storyViewed);
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

    @Transactional(readOnly = true)
    public List<StoryFeedResponse> getFollowingStoriesFeed(Long currentUserId) {
        LocalDateTime now = LocalDateTime.now();

        // 팔로잉 중이고 & 활성화된 스토리 가진 유저들 조회
        List<User> followedUsers = storyRepository.findFolloweesWithActiveStories(currentUserId, now);

        return followedUsers.stream()
                // 유저 리스트 순회 돌면서 처리
                .map(user -> {
                    // 이 유저의 스토리 중 내가 안 본 게 있는지
                    boolean unread = storyRepository.existsUnreadStory(user.getId(), currentUserId, now);

                    // 유저별 활성 스토리 총 개수 조회
                    int totalCount =
                            (int) storyRepository.countByUserIdAndIsDeletedFalseAndExpiredAtAfter(user.getId(), now);

                    // 유저별 가장 최근 스토리 생성 시간 조회
                    // -> 스토리 바에 유저 프로필을 시간 기준으로 정렬하려고
                    LocalDateTime lastTime = storyRepository.findLastStoryCreatedAt(user.getId(), now);

                    // 작성자의 프로필 이미지 URL 가져오기
                    String profileImg =
                            (user.getUserInfo() != null) ? user.getUserInfo().getProfileImageUrl() : null;
                    // TODO: 유저 도메인에 유저 프로필 관련 로직 추가

                    // 파일명만 있는 경우 서버 경로를 붙여 완전한 URL로 변환
                    if (profileImg != null && !profileImg.startsWith("http")) {
                        profileImg = "/uploads/" + profileImg;
                    }

                    return StoryFeedResponse.builder()
                            .userId(user.getId())
                            .nickname(user.getNickname())
                            .profileImageUrl(profileImg)
                            .isUnread(unread)
                            .totalStoryCount(totalCount)
                            .lastUpdatedAt(lastTime)
                            .build();
                })
                .sorted(Comparator
                        // 안 읽은 스토리들 isUnread=true 우선 앞으로
                        .comparing(StoryFeedResponse::isUnread)
                        .reversed()
                        // 그 안에선 최신순으로 정렬
                        .thenComparing(StoryFeedResponse::lastUpdatedAt, Comparator.reverseOrder()))
                .toList();
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

    // 해당 유저가 스토리 보유자와 동일인인지 판별해서 -> rs DTO 생성
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

        // 미디어 파일명에 서버 경로를 붙여 완전한 URL 생성
        String fullMediaUrl = story.getStoryMedia().getSourceUrl();
        if (fullMediaUrl != null && !fullMediaUrl.startsWith("http")) {
            fullMediaUrl = "/uploads/" + fullMediaUrl;
        }

        return StoryDetailResponse.builder()
                .storyId(story.getId())
                .userId(story.getUser().getId())
                .content(story.getContent())
                .mediaUrl(fullMediaUrl)
                .mediaType(story.getStoryMedia().getMediaType())
                .createdAt(story.getCreatedAt())
                .expiredAt(story.getExpiredAt())
                .totalLikeCount(isAuthor ? story.getLikeCount() : -1)
                // ㄴ 현재 조회자가 작성자면 정상 갯수 반환, 작성자가 아니면 무조건 좋아요 갯수 -1 반환

                .isLiked(isLiked) // 좋아요 눌렀는지 여부
                .taggedUserIds(story.getTags().stream()
                        .map(tag -> tag.getTarget().getId())
                        .toList())
                .viewers(viewers)
                .likers(likers)
                // 작성자일 때만 채워진 리스트가 나가고, 작성자 본인 아니면 null로
                .build();
    }
}
