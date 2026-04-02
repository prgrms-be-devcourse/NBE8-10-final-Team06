package com.devstagram.domain.user.service;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;

    // 토큰 저장: 지정된 시간이 지나면 Redis에서 자동 삭제됨 (TTL)
    public void save(Long userId, String refreshToken, long expireSeconds) {
        redisTemplate.opsForValue().set(PREFIX + userId, refreshToken, Duration.ofSeconds(expireSeconds));
    }

    // 토큰 조회: Redis에서 해당 유저의 토큰을 가져옴
    public String get(Long userId) {
        return redisTemplate.opsForValue().get(PREFIX + userId);
    }

    // 토큰 검증: DB(Redis)에 저장된 값과 일치하는지 확인
    public boolean matches(Long userId, String refreshToken) {
        String savedToken = get(userId);
        return savedToken != null && savedToken.equals(refreshToken);
    }

    // 토큰 삭제: 로그아웃 시 Redis에서 즉시 제거
    public void delete(Long userId) {
        redisTemplate.delete(PREFIX + userId);
    }
}
