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

        // 3. 유저의 기술 벡터를 기반으로 상위 5개 기술 추출
        List<TechScoreDto> topTechScores = getTopTechScoresFromVector(targetUser);

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

    private List<TechScoreDto> getTopTechScoresFromVector(User user) {
        // 1. 유저 엔티티에 저장된 기술 점수 벡터를 가져온다.
        float[] techVector = user.getTechVector();

        // 벡터가 비어 있으면 보여줄 기술이 없으므로 빈 리스트 반환
        if (techVector == null || techVector.length == 0) {
            return Collections.emptyList();
        }

        // 2. 점수가 0보다 큰 기술만 따로 모아둘 리스트
        List<TechScoreInfo> scoredTechnologies = new ArrayList<>();

        // 3. 벡터를 처음부터 끝까지 순회하면서
        //    점수가 있는 기술만 (기술ID, 점수) 형태로 저장
        for (int index = 0; index < techVector.length; index++) {
            float score = techVector[index];

            // 점수가 0보다 큰 경우만 관심 기술로 본다
            if (score > 0) {
                // 벡터 index는 0부터 시작하므로 실제 기술 ID는 +1
                long technologyId = index + 1L;

                scoredTechnologies.add(new TechScoreInfo(technologyId, score));
            }
        }

        // 관심 기술이 하나도 없으면 빈 리스트 반환
        if (scoredTechnologies.isEmpty()) {
            return Collections.emptyList();
        }

        // 4. 점수 높은 순으로 정렬한 뒤 상위 5개만 추출
        List<TechScoreInfo> top5Technologies = scoredTechnologies.stream()
                .sorted((first, second) -> Float.compare(second.score(), first.score()))
                .limit(5)
                .toList();

        // 5. 상위 5개 기술의 ID만 추출
        List<Long> technologyIds =
                top5Technologies.stream().map(TechScoreInfo::techId).toList();

        // 6. 기술 ID들로 Technology 엔티티를 한 번에 조회
        //    현재는 기술 이름만 사용하지만, repository 메서드가 category도 함께 fetch하도록 되어 있다
        List<Technology> technologies = technologyRepository.findAllByIdsWithCategory(technologyIds);

        // 7. 조회한 Technology를 "기술ID -> Technology" 형태의 Map으로 변환
        //    나중에 빠르게 찾아 쓰기 위해서
        Map<Long, Technology> technologyById =
                technologies.stream().collect(Collectors.toMap(Technology::getId, technology -> technology));

        // 8. 상위 5개 정보(top5Technologies)를 DTO로 변환
        return top5Technologies.stream()
                .map(techScoreInfo -> {
                    // 기술 ID로 실제 Technology 엔티티 찾기
                    Technology technology = technologyById.get(techScoreInfo.techId());

                    // 혹시 조회 결과가 없으면 null 반환 후 아래 filter에서 제거
                    if (technology == null) {
                        return null;
                    }

                    // 벡터 점수는 float이므로 DTO의 int에 맞게 반올림해서 변환
                    return TechScoreDto.of(technology, Math.round(techScoreInfo.score()));
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
