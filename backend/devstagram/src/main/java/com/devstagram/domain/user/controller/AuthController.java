package com.devstagram.domain.user.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.domain.user.dto.LoginResponse;
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

    @PostMapping("/signup")
    public RsData<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return RsData.success("회원가입이 완료되었습니다.", response);
    }

    @PostMapping("/login")
    public RsData<String> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse loginResponse = authService.login(request);

        rq.setCookie("accessToken", loginResponse.accessToken());

        return RsData.success("로그인 성공", loginResponse.accessToken());
    }

    @GetMapping("/me")
    public RsData<SignupResponse> me(@AuthenticationPrincipal SecurityUser user) {
        SignupResponse response = userSecurityService.getMyInfo(user.getId());

        return RsData.success("내 정보 조회 성공", response);
    }

    @PostMapping("/logout")
    public RsData<Void> logout() {
        rq.deleteCookie("accessToken");
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
