package com.devstagram.domain.user.controller;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.domain.user.dto.ProfileUpdateRequest;
import com.devstagram.domain.user.dto.UserProfileResponse;
import com.devstagram.domain.user.service.UserService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

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
            @PathVariable String nickname, @AuthenticationPrincipal SecurityUser loginUser) {
        Long currentUserId = (loginUser != null) ? loginUser.getId() : null;
        UserProfileResponse response = userService.getUserProfile(nickname, currentUserId);
        return RsData.success("프로필 조회 성공", response);
    }

    /**
     * 내 프로필 정보 수정
     */
    @PutMapping(value = "/me/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RsData<Void> updateProfile(
            @AuthenticationPrincipal SecurityUser loginUser,
            @Valid @RequestPart("request") ProfileUpdateRequest request,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {
        // Service에 파일까지 같이 넘겨줌
        userService.updateProfile(loginUser.getId(), request, profileImage);
        return RsData.success("프로필이 수정되었습니다.", null);
    }
}
