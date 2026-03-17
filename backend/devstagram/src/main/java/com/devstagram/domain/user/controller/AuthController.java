package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.dto.SignupResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.AuthService;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.SecurityUser;
import com.devstagram.global.security.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final JwtProvider jwtProvider;
    private final Rq rq;
    private final UserSecurityService userSecurityService;

    @PostMapping("/signup")
    public RsData<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return RsData.success("회원가입이 완료되었습니다.", response);
    }

    @PostMapping("/login")
    public RsData<String> login(@Valid @RequestBody LoginRequest request) {
        User user = authService.login(request);

        String accessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());

        rq.setCookie("accessToken", accessToken);
        rq.setCookie("apiKey", user.getApiKey());

        return RsData.success("로그인 성공", accessToken);
    }

    @GetMapping("/me")
    public RsData<SignupResponse> me() {
        SecurityUser user = SecurityUtil.getCurrentUser();
        User entity = userSecurityService.findById(user.getId());
        return RsData.success("내 정보 조회 성공", SignupResponse.from(entity));
    }

    @PostMapping("/logout")
    public RsData<Void> logout() {
        rq.deleteCookie("accessToken");
        rq.deleteCookie("apiKey");
        return RsData.success("로그아웃 되었습니다.", null);
    }
}