package com.devstagram.domain.user.service;

import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public void follow(Long fromUserId, Long toUserId) {
        if (fromUserId.equals(toUserId)) {
            throw new ServiceException("400-F-1", "자기 자신을 팔로우할 수 없습니다.");
        }

        User fromUser = getUserById(fromUserId);
        User toUser = getUserById(toUserId);

        if (followRepository.existsByFromUserAndToUser(fromUser, toUser)) {
            throw new ServiceException("400-F-2", "이미 팔로우 중인 사용자입니다.");
        }

        Follow follow = Follow.builder()
                .fromUser(fromUser)
                .toUser(toUser)
                .build();

        followRepository.save(follow);
    }

    @Transactional
    public void unfollow(Long fromUserId, Long toUserId) {
        User fromUser = getUserById(fromUserId);
        User toUser = getUserById(toUserId);

        Follow follow = followRepository.findByFromUserAndToUser(fromUser, toUser)
                .orElseThrow(() -> new ServiceException("400-F-3", "팔로우 관계가 아닙니다."));

        followRepository.delete(follow);
    }

    // [공통 로직 추출]
    private User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다. ID: " + id));
    }

    /**
     * 특정 유저의 팔로잉 수 조회
     */
    public long getFollowingCount(Long userId) {
        User user = getUserById(userId);
        return followRepository.countByFromUser(user);
    }

    /**
     * 특정 유저의 팔로워 수 조회
     */
    public long getFollowerCount(Long userId) {
        User user = getUserById(userId);
        return followRepository.countByToUser(user);
    }
}
