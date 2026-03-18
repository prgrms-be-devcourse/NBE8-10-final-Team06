package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.service.FollowService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/follows")
public class FollowController {

    private final FollowService followService;

    // 팔로우 실행
    @PostMapping("/{toUserId}")
    public RsData<Void> follow(@PathVariable Long toUserId) {
        Long loginUserId = SecurityUtil.getCurrentUserId();

        followService.follow(loginUserId, toUserId);
        return RsData.success("팔로우가 완료되었습니다.", null);
    }

    // 팔로우 취소 (언팔로우)
    @DeleteMapping("/{toUserId}")
    public RsData<Void> unfollow(@PathVariable Long toUserId) {
        Long loginUserId = SecurityUtil.getCurrentUserId();

        followService.unfollow(loginUserId, toUserId);
        return RsData.success("언팔로우가 완료되었습니다.", null);
    }

    // 특정 유저의 팔로워 수 조회
    @GetMapping("/{userId}/follower-count")
    public RsData<Long> getFollowerCount(@PathVariable Long userId) {
        long count = followService.getFollowerCount(userId);
        return RsData.success("팔로워 수 조회 성공", count);
    }

    // 특정 유저의 팔로잉 수 조회
    @GetMapping("/{userId}/following-count")
    public RsData<Long> getFollowingCount(@PathVariable Long userId) {
        long count = followService.getFollowingCount(userId);
        return RsData.success("팔로잉 수 조회 성공", count);
    }
}
