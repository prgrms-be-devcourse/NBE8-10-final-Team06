package com.devstagram.global.security;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

/**
 * Redis를 활용하여 특정 요청의 빈도를 제한하는 서비스
 * 윈도우(시간 범위) 내에서 허용된 횟수를 초과했는지 체크함
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    public boolean isAllowed(String key, long limit, Duration window) {
        String redisKey = "rate-limit:" + key;

        Long count = redisTemplate.opsForValue().increment(redisKey);

        if (count == null) {
            return false;
        }

        if (count == 1L) {
            redisTemplate.expire(redisKey, window);
        }

        return count <= limit;
    }

    public long getRetryAfterSeconds(String key) {
        String redisKey = "rate-limit:" + key;
        Long ttl = redisTemplate.getExpire(redisKey);
        return ttl == null || ttl < 0 ? 60 : ttl;
    }
}
