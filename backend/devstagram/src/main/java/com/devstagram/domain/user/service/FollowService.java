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
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public FollowResponse follow(Long fromUserId, Long toUserId) {
        log.info("[FOLLOW SERVICE] follow start: fromUserId={}, toUserId={}", fromUserId, toUserId);
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

        userRepository.increaseFollowerCount(toUserId);
        userRepository.increaseFollowingCount(fromUserId);

        FollowResponse response = createFollowResponse(toUserId, fromUserId, true);
        log.info("[FOLLOW SERVICE] follow success: {}", response);
        return response;
    }

    /**
     * 언팔로우 — 관계가 없으면 400 대신 성공(멱등).
     * 프론트·DB 간 일시 불일치, 중복 요청, 카운트만 남은 경우에도 UI가 '팔로우 해제'로 수렴하도록 한다.
     */
    @Transactional
    public FollowResponse unfollow(Long fromUserId, Long toUserId) {
        log.info("[FOLLOW SERVICE] unfollow start: fromUserId={}, toUserId={}", fromUserId, toUserId);
        if (fromUserId.equals(toUserId)) {
            throw new ServiceException("400-F-4", "자기 자신을 언팔로우할 수 없습니다.");
        }

        boolean hadRelation = followRepository.existsByFromUserIdAndToUserId(fromUserId, toUserId);
        if (!hadRelation) {
            log.warn(
                    "[FOLLOW SERVICE] unfollow requested but relation not found: fromUserId={}, toUserId={}",
                    fromUserId,
                    toUserId);
        }
        int deletedRows = followRepository.deleteAllByFromUserIdAndToUserId(fromUserId, toUserId);
        if (deletedRows > 0) {
            // 정상 데이터(유니크 제약 하)에서는 1회만 감소.
            // 과거 중복 행이 있더라도 카운트 음수는 방지되어 있어 안전함.
            userRepository.decreaseFollowerCount(toUserId);
            userRepository.decreaseFollowingCount(fromUserId);
        }

        FollowResponse response = createFollowResponse(toUserId, fromUserId, false);
        log.info(
                "[FOLLOW SERVICE] unfollow done: relationExisted={}, deletedRows={}, response={}",
                hadRelation,
                deletedRows,
                response);
        return response;
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
        return getUserById(userId).getFollowingCount();
    }

    /**
     * 특정 유저의 팔로워 수 조회
     */
    public long getFollowerCount(Long userId) {
        return getUserById(userId).getFollowerCount();
    }

    /**
     * 특정 유저가 팔로잉하는 사람들 목록
     */
    public List<FollowUserResponse> getFollowings(Long targetUserId, Long loginUserId) {
        return followRepository.findAllByFromUserId(targetUserId).stream()
                .map(follow -> {
                    User targetUser = follow.getToUser();
                    boolean isFollowing = (loginUserId != null)
                            && followRepository.existsByFromUserIdAndToUserId(loginUserId, targetUser.getId());
                    return FollowUserResponse.of(targetUser, isFollowing);
                })
                .toList();
    }

    /**
     * 특정 유저를 팔로우하는 사람들 목록
     */
    public List<FollowUserResponse> getFollowers(Long targetUserId, Long loginUserId) {
        return followRepository.findAllByToUserId(targetUserId).stream()
                .map(follow -> {
                    User follower = follow.getFromUser();
                    boolean isFollowing = (loginUserId != null)
                            && followRepository.existsByFromUserIdAndToUserId(loginUserId, follower.getId());
                    return FollowUserResponse.of(follower, isFollowing);
                })
                .toList();
    }

    public boolean isFollowing(Long fromUserId, Long toUserId) {
        return followRepository.existsByFromUserIdAndToUserId(fromUserId, toUserId);
    }

    // UI 갱신을 위한 최신 카운트 정보 조회 및 DTO 생성
    private FollowResponse createFollowResponse(Long toUserId, Long fromUserId, boolean isFollowing) {
        // @Modifying(clearAutomatically = true) 덕분에 findById 시 최신 DB 값이 객체에 반영됨
        User toUser = getUserById(toUserId);
        User fromUser = getUserById(fromUserId);

        return FollowResponse.of(toUserId, isFollowing, toUser.getFollowerCount(), fromUser.getFollowingCount());
    }
}
