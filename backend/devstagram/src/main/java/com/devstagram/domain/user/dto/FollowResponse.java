package com.devstagram.domain.user.dto;

import lombok.Builder;

@Builder
public record FollowResponse(
        Long toUserId, // 팔로우/언팔로우 동작의 대상자(상대방) ID
        boolean isFollowing, // 현재 로그인한 '나'의 팔로우 상태
        long followerCount, // '상대방(toUserId)'의 최신 팔로워 총 숫자
        long followingCount // '나(로그인 유저)'의 최신 팔로잉 총 숫자
        ) {
    public static FollowResponse of(Long toUserId, boolean isFollowing, long followerCount, long followingCount) {
        return FollowResponse.builder()
                .toUserId(toUserId)
                .isFollowing(isFollowing)
                .followerCount(followerCount)
                .followingCount(followingCount)
                .build();
    }
}
