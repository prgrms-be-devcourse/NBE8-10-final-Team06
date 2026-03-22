package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.service.UserService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    /**
     * 특정 사용자의 프로필 조회
     */
    @GetMapping("/{nickname}/profile")
    public RsData<UserProfileResponse> getProfile(
            @PathVariable String nickname,
            @AuthenticationPrincipal SecurityUser loginUser
    ) {
        // 로그인하지 않은 사용자(비회원)도 프로필은 볼 수 있어야 하므로 null 체크
        Long currentUserId = (loginUser != null) ? loginUser.getId() : null;

        UserProfileResponse response = userService.getUserProfile(nickname, currentUserId);

        return RsData.success("프로필 조회 성공", response);
    }
}