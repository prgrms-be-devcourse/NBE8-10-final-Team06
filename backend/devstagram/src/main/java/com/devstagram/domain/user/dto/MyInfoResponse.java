package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.User;

public record MyInfoResponse(Long id, String nickname, String email) {
    public static MyInfoResponse from(User user) {
        return new MyInfoResponse(user.getId(), user.getNickname(), user.getEmail());
    }
}
