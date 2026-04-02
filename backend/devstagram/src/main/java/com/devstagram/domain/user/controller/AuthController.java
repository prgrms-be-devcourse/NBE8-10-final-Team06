package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.dto.AuthResult;
import com.devstagram.global.security.JwtProvider;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.domain.user.dto.LoginResponse;
import com.devstagram.domain.user.dto.MyInfoResponse;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.dto.SignupResponse;
import com.devstagram.domain.user.service.AuthService;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final Rq rq;
    private final UserSecurityService userSecurityService;
    private final JwtProvider jwtProvider;

    @PostMapping("/signup")
    public RsData<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return RsData.success("회원가입이 완료되었습니다.", response);
    }

    @PostMapping("/login")
    public RsData<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult result = authService.login(request);

        int accessTokenMaxAge = (int) jwtProvider.getAccessTokenExpireSeconds();
        int refreshTokenMaxAge = (int) jwtProvider.getRefreshTokenExpireSeconds();

        rq.setCookie("accessToken", result.accessToken(), accessTokenMaxAge);
        rq.setCookie("refreshToken", result.refreshToken(), refreshTokenMaxAge);

        return RsData.success("로그인 성공", result.response());
    }

    @PostMapping("/refresh")
    public RsData<LoginResponse> refresh() {
        String refreshToken = rq.getCookieValue("refreshToken", "");

        AuthResult result = authService.refresh(refreshToken);

        int accessTokenMaxAge = (int) jwtProvider.getAccessTokenExpireSeconds();
        int refreshTokenMaxAge = (int) jwtProvider.getRefreshTokenExpireSeconds();

        rq.setCookie("accessToken", result.accessToken(), accessTokenMaxAge);
        rq.setCookie("refreshToken", result.refreshToken(), refreshTokenMaxAge);

        return RsData.success("토큰 재발급 성공", result.response());
    }

    @GetMapping("/me")
    public RsData<MyInfoResponse> me(@AuthenticationPrincipal SecurityUser user) {
        MyInfoResponse response = userSecurityService.getMyInfo(user.getId());

        return RsData.success("내 정보 조회 성공", response);
    }

    @PostMapping("/logout")
    public RsData<Void> logout(@AuthenticationPrincipal SecurityUser user) {
        if (user != null) {
            authService.logout(user.getId());
        }

        rq.deleteCookie("accessToken");
        rq.deleteCookie("refreshToken");
        rq.deleteCookie("apiKey");

        return RsData.success("로그아웃 되었습니다.", null);
    }

    @GetMapping("/check-email")
    public RsData<Void> checkEmail(@RequestParam String email) {
        authService.checkEmail(email);
        return RsData.success("사용 가능한 이메일입니다.", null);
    }

    @GetMapping("/check-nickname")
    public RsData<Void> checkNickname(@RequestParam String nickname) {
        authService.checkNickname(nickname);
        return RsData.success("사용 가능한 닉네임입니다.", null);
    }
}