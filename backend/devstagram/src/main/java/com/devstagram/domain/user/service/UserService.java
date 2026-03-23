package com.devstagram.domain.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.entity.User;
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
        User targetUser = userRepository
                .findByNickname(nickname)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다. 닉네임: " + nickname));

        long postCount = targetUser.getPostCount();
        long followerCount = targetUser.getFollowerCount();
        long followingCount = targetUser.getFollowingCount();

        boolean isFollowing = false;
        if (currentUserId != null) {
            isFollowing = followService.isFollowing(currentUserId, targetUser.getId());
        }

        return UserProfileResponse.of(targetUser, postCount, followerCount, followingCount, isFollowing);
    }
}
