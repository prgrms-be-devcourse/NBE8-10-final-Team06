package com.devstagram.domain.user.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.domain.post.dto.PostFeedProfileRes;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.technology.dto.TechScoreDto;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.dto.UserSearchResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
import com.devstagram.domain.user.event.UserWithdrawnEvent;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.storage.StorageService;
import com.devstagram.global.util.FileValidator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final FollowService followService;
    private final StorageService storageService;
    private final FileValidator fileValidator;
    private final PostRepository postRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TechnologyRepository technologyRepository;

    /**
     * 특정 사용자의 프로필 정보 조회
     */
    public UserProfileResponse getUserProfile(String nickname, Long currentUserId, Pageable pageable) {
        // 1. Fetch Join이 적용된 메서드로 변경 (성능 최적화)
        User targetUser = userRepository
                .findByNicknameWithInfo(nickname)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        // 2. 팔로우 여부 확인
        boolean isFollowing = false;
        if (currentUserId != null) {
            isFollowing = followService.isFollowing(currentUserId, targetUser.getId());
        }

        // 3. 모든 기술 스택(비중 포함)을 한 번에 가져옴
        List<TechScoreDto> allTechScores = getAllTechScoresFromVector(targetUser);

        // 프로필 상단 요약(Highlight) 정보를 위해 상위 5개 추출 (나중에 쓸 수도 있을 것 같아서 만들었음)
        List<TechScoreDto> topTechScores = allTechScores.stream()
                .limit(5)
                .toList();

        // 4. 프로필에 보여줄 게시글 목록 조회 (최신순 정렬 적용)
        Slice<Post> postEntities =
                postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(targetUser.getId(), pageable);

        Slice<PostFeedProfileRes> posts = postEntities.map(PostFeedProfileRes::from);

        // 5. 최종 프로필 응답 생성
        return UserProfileResponse.of(
                targetUser,
                targetUser.getPostCount(),
                targetUser.getFollowerCount(),
                targetUser.getFollowingCount(),
                isFollowing,
                topTechScores,
                allTechScores,
                posts);
    }

    /**
     * 사용자의 프로필 정보 수정
     */
    @Transactional
    public void updateProfile(Long userId, ProfileUpdateRequest request, MultipartFile profileImage) {
        User user =
                userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        // 1. 이미지 파일 처리
        String imageUrl = user.getProfileImageUrl(); // 기본값: 기존 이미지 유지

        if (profileImage != null && !profileImage.isEmpty()) {
            // 이미지 형식 검증
            fileValidator.validateImage(profileImage);

            // 기존 파일이 서버에 저장되어 있다면 삭제 (파일 중복 방지)
            if (imageUrl != null && !imageUrl.isBlank()) {
                storageService.delete(imageUrl);
            }

            // 새로운 파일 저장 후 파일명(URL) 반환
            imageUrl = storageService.store(profileImage);
        }

        // 2. 닉네임 중복 체크 (기존 닉네임과 다를 경우에만 수행)
        if (!user.getNickname().equals(request.nickname())) {
            if (userRepository.existsByNickname(request.nickname())) {
                throw new ServiceException("409-U-2", "이미 사용 중인 닉네임입니다.");
            }
        }

        // 3. 기본 정보 수정 (업데이트된 imageUrl 반영)
        user.updateProfile(request.nickname(), imageUrl, request.birthDate(), request.gender());

        // 4. 상세 정보(UserInfo) 수정
        if (user.getUserInfo() != null) {
            user.getUserInfo().updateInfo(request.githubUrl(), request.resume());
        } else {
            // 방어 코드: UserInfo가 없는 경우 새로 생성하여 연결
            user.setUserInfo(UserInfo.builder()
                    .githubUrl(request.githubUrl())
                    .resume(request.resume())
                    .build());
        }
    }

    public Slice<UserSearchResponse> searchUsers(String keyword, Long currentUserId, Pageable pageable) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return new SliceImpl<>(Collections.emptyList(), pageable, false);
        }

        Slice<User> users = userRepository.findByNicknameContaining(keyword, pageable);

        // 2. 검색된 각 유저에 대해 '내가 팔로우 중인지' 여부를 확인하며 DTO로 변환
        return users.map(user -> {
            boolean isFollowing = false;
            if (currentUserId != null) {
                isFollowing = followService.isFollowing(currentUserId, user.getId());
            }
            return UserSearchResponse.of(user, isFollowing);
        });
    }

    @Transactional
    public void withdraw(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-U-1", "유저 없음"));

        // 1. (User) 상태 변경
        user.softDelete();

        // 이 코드가 실행되는 순간, 이 이벤트를 기다리던 리스너들이 동시에 동작합니다.
        eventPublisher.publishEvent(new UserWithdrawnEvent(userId));
    }

    private List<TechScoreDto> getAllTechScoresFromVector(User user) {
        // 1. 유저 엔티티에 저장된 기술 점수 벡터를 가져온다.
        float[] techVector = user.getTechVector();

        // 벡터가 비어 있으면 보여줄 기술이 없으므로 빈 리스트 반환
        if (techVector == null || techVector.length == 0) {
            return Collections.emptyList();
        }

        // 2. 점수가 0보다 큰 기술만 따로 모아둘 리스트, '전체 점수 합계'를 먼저 계산
        List<TechScoreInfo> scoredInfos = new ArrayList<>();
        double totalScoreSum = 0;

        for (int i = 0; i < techVector.length; i++) {
            float score = techVector[i];
            if (score > 0) {
                scoredInfos.add(new TechScoreInfo((long) i + 1, score));
                totalScoreSum += score;
            }
        }

        if (scoredInfos.isEmpty()) return Collections.emptyList();

        // 3. 기술 엔티티들을 한 번에 조회 (N+1 방지)
        List<Long> ids = scoredInfos.stream().map(TechScoreInfo::techId).toList();
        List<Technology> technologies = technologyRepository.findAllByIdsWithCategory(ids);
        Map<Long, Technology> techMap = technologies.stream()
                .collect(Collectors.toMap(Technology::getId, t -> t));

        // 4. 점수 높은 순으로 정렬 후 TechScoreDto로 변환 (비중 계산 포함)
        final double finalTotalSum = totalScoreSum;
        return scoredInfos.stream()
                .sorted((a, b) -> Float.compare(b.score(), a.score()))
                .map(info -> {
                    Technology t = techMap.get(info.techId());
                    if (t == null) return null;
                    // 준비하신 of 메서드 호출!
                    return TechScoreDto.of(t, Math.round(info.score()), finalTotalSum);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * 벡터에서 꺼낸 "기술 ID + 점수"를 임시로 담아두기 위한 내부 record
     *
     * ex) techId = 3, score = 45.0f
     */
    private record TechScoreInfo(Long techId, float score) {}
}
