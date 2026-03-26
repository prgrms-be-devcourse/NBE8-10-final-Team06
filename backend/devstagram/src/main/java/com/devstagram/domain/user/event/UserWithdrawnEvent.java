package com.devstagram.domain.user.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class UserWithdrawnEvent {
    private final Long userId; // 탈퇴한 유저의 ID만 전달
}