package com.devstagram.domain.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.domain.user.dto.LoginResponse;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.dto.SignupResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.security.JwtProvider;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        checkEmail(request.email());
        checkNickname(request.nickname());

        // 1. 원본 랜덤 UUID 생성 (DB 저장용 소스)
        String uuid = java.util.UUID.randomUUID().toString();

        String encodedPassword = passwordEncoder.encode(request.password());
        String encodedApiKey = passwordEncoder.encode(uuid);

        User user = request.toEntity(encodedPassword, encodedApiKey);
        userRepository.save(user);

        // 이렇게 해야 나중에 필터에서 ID로 유저를 광속으로 찾고 UUID를 검증할 수 있습니다.
        String publicApiKey = user.getId() + "." + uuid;

        return SignupResponse.of(user, publicApiKey);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository
                .findByEmail(request.email())
                .orElseThrow(() -> new ServiceException("401-U-1", "이메일 또는 비밀번호가 일치하지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ServiceException("401-U-1", "이메일 또는 비밀번호가 일치하지 않습니다.");
        }

        String accessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());

        // 로그인 응답에서는 보안을 위해 apiKey를 제외
        return new LoginResponse(accessToken, null, user.getEmail(), user.getNickname());
    }

    public void checkEmail(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new ServiceException("409-U-1", "이미 사용 중인 이메일입니다.");
        }
    }

    public void checkNickname(String nickname) {
        if (userRepository.existsByNickname(nickname)) {
            throw new ServiceException("409-U-2", "이미 사용 중인 닉네임입니다.");
        }
    }
}
