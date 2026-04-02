package com.devstagram.domain.user.service;

import com.devstagram.domain.user.dto.AuthResult;
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
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        checkEmail(request.email());
        checkNickname(request.nickname());

        String uuid = java.util.UUID.randomUUID().toString();

        String encodedPassword = passwordEncoder.encode(request.password());
        String encodedApiKey = passwordEncoder.encode(uuid);

        User user = request.toEntity(encodedPassword, encodedApiKey);
        userRepository.save(user);

        String publicApiKey = user.getId() + "." + uuid;

        return SignupResponse.of(user, publicApiKey);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        long start = System.currentTimeMillis();

        User user = userRepository
                .findByEmailAndIsDeletedFalse(request.email())
                .orElseThrow(() -> new ServiceException("401-U-1", "이메일 또는 비밀번호가 일치하지 않습니다."));
        long afterUserQuery = System.currentTimeMillis();

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            long afterPasswordCheck = System.currentTimeMillis();

            log.info(
                    "[LOGIN_TIMING_FAIL] email={}, userQueryMs={}, passwordCheckMs={}, totalMs={}",
                    request.email(),
                    afterUserQuery - start,
                    afterPasswordCheck - afterUserQuery,
                    afterPasswordCheck - start
            );

            throw new ServiceException("401-U-1", "이메일 또는 비밀번호가 일치하지 않습니다.");
        }
        long afterPasswordCheck = System.currentTimeMillis();

        String accessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());
        String refreshToken = jwtProvider.genRefreshToken(user.getId());

        refreshTokenService.save(
                user.getId(),
                refreshToken,
                jwtProvider.getRefreshTokenExpireSeconds()
        );

        LoginResponse response = new LoginResponse(user.getEmail(), user.getNickname());

        return new AuthResult(accessToken, refreshToken, response);
    }

    @Transactional
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ServiceException("401-F-1", "리프레시 토큰이 없습니다.");
        }

        if (!jwtProvider.isValid(refreshToken) || !jwtProvider.isRefreshToken(refreshToken)) {
            throw new ServiceException("401-F-1", "유효하지 않은 리프레시 토큰입니다.");
        }

        Long userId = jwtProvider.getUserId(refreshToken);

        if (!refreshTokenService.matches(userId, refreshToken)) {
            throw new ServiceException("401-F-1", "저장된 리프레시 토큰과 일치하지 않습니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));

        String newAccessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());
        String newRefreshToken = jwtProvider.genRefreshToken(user.getId());

        refreshTokenService.save(
                user.getId(),
                newRefreshToken,
                jwtProvider.getRefreshTokenExpireSeconds()
        );

        LoginResponse response = new LoginResponse(user.getEmail(), user.getNickname());

        return new AuthResult(newAccessToken, newRefreshToken, response);
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenService.delete(userId);
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