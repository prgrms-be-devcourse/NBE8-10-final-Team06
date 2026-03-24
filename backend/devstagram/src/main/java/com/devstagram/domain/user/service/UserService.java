package com.devstagram.domain.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final FollowService followService; // 이미 잘 만들어두신 서비스를 주입받습니다!

    /**
     * 특정 사용자의 프로필 정보 조회
     */
    public UserProfileResponse getUserProfile(String nickname, Long currentUserId) {
        // 1. Fetch Join이 적용된 메서드로 변경 (성능 최적화)
        User targetUser = userRepository
                .findByNicknameWithInfo(nickname)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        // 2. 팔로우 여부 확인 (기존 followService 로직 재사용)
        boolean isFollowing = false;
        if (currentUserId != null) {
            isFollowing = followService.isFollowing(currentUserId, targetUser.getId());
        }

        // 3. Entity 내부의 카운트 필드를 사용하여 응답 생성
        return UserProfileResponse.of(
                targetUser,
                targetUser.getPostCount(),
                targetUser.getFollowerCount(),
                targetUser.getFollowingCount(),
                isFollowing);
    }

    /**
     * 사용자의 프로필 정보 수정
     */
    @Transactional
    public void updateProfile(Long userId, ProfileUpdateRequest request) {
        User user =
                userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        // 1. 닉네임 중복 체크 (기존 닉네임과 다를 경우에만)
        if (!user.getNickname().equals(request.nickname())) {
            if (userRepository.existsByNickname(request.nickname())) {
                throw new ServiceException("409-U-2", "이미 사용 중인 닉네임입니다.");
            }
        }

        // 2. 기본 정보 수정
        user.updateProfile(request.nickname(), request.profileImageUrl(), request.birthDate(), request.gender());

        // 3. 상세 정보(UserInfo) 수정
        if (user.getUserInfo() != null) {
            user.getUserInfo().updateInfo(request.githubUrl(), request.resume());
        } else {
            // 혹시라도 UserInfo가 없다면 새로 생성해서 연결 (방어 코드)
            user.setUserInfo(UserInfo.builder()
                    .githubUrl(request.githubUrl())
                    .resume(request.resume())
                    .build());
        }
    }
}
