package com.devstagram.domain.user.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devstagram.domain.user.dto.FollowResponse;
import com.devstagram.domain.user.dto.FollowUserResponse;
import com.devstagram.domain.user.service.FollowService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/follows")
public class FollowController {

    private final FollowService followService;

    // 팔로우 실행
    @PostMapping("/{toUserId}")
    public RsData<FollowResponse> follow(@PathVariable Long toUserId, @AuthenticationPrincipal SecurityUser loginUser) {
        FollowResponse response = followService.follow(loginUser.getId(), toUserId);
        return RsData.success("팔로우가 완료되었습니다.", response);
    }

    // 팔로우 취소 (언팔로우)
    @DeleteMapping("/{toUserId}")
    public RsData<FollowResponse> unfollow(
            @PathVariable Long toUserId, @AuthenticationPrincipal SecurityUser loginUser) {
        FollowResponse response = followService.unfollow(loginUser.getId(), toUserId);
        return RsData.success("언팔로우가 완료되었습니다.", response);
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

    // 특정 유저의 팔로잉 목록 조회
    @GetMapping("/{userId}/followings")
    public RsData<List<FollowUserResponse>> getFollowings(@PathVariable Long userId) {
        List<FollowUserResponse> followings = followService.getFollowings(userId);
        return RsData.success("팔로잉 목록 조회 성공", followings);
    }

    // 특정 유저의 팔로워 목록 조회
    @GetMapping("/{userId}/followers")
    public RsData<List<FollowUserResponse>> getFollowers(@PathVariable Long userId) {
        List<FollowUserResponse> followers = followService.getFollowers(userId);
        return RsData.success("팔로워 목록 조회 성공", followers);
    }

    // 내가 이 유저를 팔로우하고 있는지 확인
    @GetMapping("/{toUserId}/status")
    public RsData<Boolean> isFollowing(@PathVariable Long toUserId, @AuthenticationPrincipal SecurityUser loginUser) {
        boolean status = followService.isFollowing(loginUser.getId(), toUserId);
        return RsData.success("팔로우 여부 조회 성공", status);
    }
}
