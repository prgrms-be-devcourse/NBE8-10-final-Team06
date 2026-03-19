package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;

public record FollowUserResponse(Long id, String nickname, String profileImageUrl // 나중에 이미지가 추가되면 사용, 지금은 null 처리 가능
        ) {
    public static FollowUserResponse from(User user) {
        return new FollowUserResponse(
                user.getId(), user.getNickname(), null // 현재 User 엔티티에 이미지 필드가 없다면 null로 두기
                );
    }
}
