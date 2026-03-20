package com.devstagram.domain.user.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.FollowResponse;
import com.devstagram.domain.user.dto.FollowUserResponse;
import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public FollowResponse follow(Long fromUserId, Long toUserId) {
        if (fromUserId.equals(toUserId)) {
            throw new ServiceException("400-F-1", "자기 자신을 팔로우할 수 없습니다.");
        }

        if (followRepository.existsByFromUserIdAndToUserId(fromUserId, toUserId)) {
            throw new ServiceException("400-F-2", "이미 팔로우 중인 사용자입니다.");
        }

        User fromUser = getUserById(fromUserId);
        User toUser = getUserById(toUserId);

        Follow follow = Follow.builder().fromUser(fromUser).toUser(toUser).build();
        followRepository.save(follow);

        return createFollowResponse(toUserId, fromUserId, true);
    }

    @Transactional
    public FollowResponse unfollow(Long fromUserId, Long toUserId) {
        if (fromUserId.equals(toUserId)) {
            throw new ServiceException("400-F-4", "자기 자신을 언팔로우할 수 없습니다.");
        }

        Follow follow = followRepository
                .findByFromUserIdAndToUserId(fromUserId, toUserId)
                .orElseThrow(() -> new ServiceException("400-F-3", "팔로우 관계가 아닙니다."));

        followRepository.delete(follow);

        return createFollowResponse(toUserId, fromUserId, false);
    }

    // [공통 로직 추출]
    private User getUserById(Long id) {
        return userRepository
                .findById(id)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다. ID: " + id));
    }

    /**
     * 특정 유저의 팔로잉 수 조회
     */
    public long getFollowingCount(Long userId) {
        return followRepository.countByFromUserId(userId);
    }

    /**
     * 특정 유저의 팔로워 수 조회
     */
    public long getFollowerCount(Long userId) {
        return followRepository.countByToUserId(userId);
    }

    // 특정 유저가 팔로잉하는 사람들 목록
    public List<FollowUserResponse> getFollowings(Long userId) {
        // 내가(fromUser) 팔로우한 사람들(toUser)을 가져와서 DTO로 변환
        return followRepository.findAllByFromUserId(userId).stream()
                .map(follow -> FollowUserResponse.from(follow.getToUser()))
                .toList();
    }

    // 특정 유저를 팔로우하는 사람들(팬) 목록
    public List<FollowUserResponse> getFollowers(Long userId) {
        // 나를(toUser) 팔로우한 사람들(fromUser)을 가져와서 DTO로 변환
        return followRepository.findAllByToUserId(userId).stream()
                .map(follow -> FollowUserResponse.from(follow.getFromUser()))
                .toList();
    }

    public boolean isFollowing(Long fromUserId, Long toUserId) {
        return followRepository.existsByFromUserIdAndToUserId(fromUserId, toUserId);
    }

    // UI 갱신을 위한 최신 카운트 정보 조회 및 DTO 생성
    private FollowResponse createFollowResponse(Long toUserId, Long fromUserId, boolean isFollowing) {
        // 상대방(toUser)의 팔로워 수 - 상대 프로필 UI용
        long followerCount = followRepository.countByToUserId(toUserId);

        // 나의(fromUser) 팔로잉 수 - 내 프로필 UI용
        long followingCount = followRepository.countByFromUserId(fromUserId);

        return FollowResponse.of(toUserId, isFollowing, followerCount, followingCount);
    }
}
