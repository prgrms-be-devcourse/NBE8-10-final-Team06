package com.devstagram.global.security;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

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