package com.devstagram.domain.user.service;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.domain.post.dto.PostFeedProfileRes;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.technology.dto.TechScoreDto;
import com.devstagram.domain.technology.entity.UserTechScore;
import com.devstagram.domain.technology.repository.UserTechScoreRepository;
import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
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
    private final UserTechScoreRepository userTechScoreRepository;
    private final PostRepository postRepository;

    /**
     * 특정 사용자의 프로필 정보 조회
     */
    public UserProfileResponse getUserProfile(String nickname, Long currentUserId, Pageable pageable) {
        // 1. Fetch Join이 적용된 메서드로 변경 (성능 최적화)
        User targetUser = userRepository
                .findByNicknameWithInfo(nickname)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        // 2. 팔로우 여부 확인 (기존 followService 로직 재사용)
        boolean isFollowing = false;
        if (currentUserId != null) {
            isFollowing = followService.isFollowing(currentUserId, targetUser.getId());
        }
        List<UserTechScore> allTechScores = userTechScoreRepository.findAllByUserOrderByScoreDesc(targetUser);

        List<TechScoreDto> topTechScores =
                allTechScores.stream().limit(5).map(TechScoreDto::from).toList();

        // 4. 게시글 목록 직접 조회 (최신순 정렬 적용)
        Slice<Post> postEntities = postRepository.findAllByUserIdOrderByCreatedAtDesc(targetUser.getId(), pageable);

        // 5. 프로필 전용 간소화 DTO(PostFeedProfileRes)로 변환
        Slice<PostFeedProfileRes> posts = postEntities.map(PostFeedProfileRes::from);

        // 3. Entity 내부의 카운트 필드를 사용하여 응답 생성
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
}
