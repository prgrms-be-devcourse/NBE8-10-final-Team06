package com.devstagram.global.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpireSeconds;
    private final long refreshTokenExpireSeconds;

    public JwtProvider(
            @Value("${custom.jwt.secret-key}") String secretKey,
            @Value("${custom.jwt.access-token-expire-seconds}") long accessTokenExpireSeconds,
            @Value("${custom.jwt.refresh-token-expire-seconds}") long refreshTokenExpireSeconds) {
        this.secretKey = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpireSeconds = accessTokenExpireSeconds;
        this.refreshTokenExpireSeconds = refreshTokenExpireSeconds;
    }

    public String genAccessToken(Long id, String email, String nickname) {
        Date now = new Date();
        Date expiredAt = new Date(now.getTime() + accessTokenExpireSeconds * 1000);

        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("email", email)
                .claim("nickname", nickname)
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiredAt)
                .signWith(secretKey)
                .compact();
    }

    public String genRefreshToken(Long id) {
        Date now = new Date();
        Date expiredAt = new Date(now.getTime() + refreshTokenExpireSeconds * 1000);

        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiredAt)
                .signWith(secretKey)
                .compact();
    }

    public Claims payload(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            payload(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        try {
            String type = payload(token).get("type", String.class);
            return "refresh".equals(type);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAccessToken(String token) {
        try {
            String type = payload(token).get("type", String.class);
            return "access".equals(type);
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        return Long.parseLong(payload(token).getSubject());
    }

    public String getEmail(String token) {
        return payload(token).get("email", String.class);
    }

    public String getNickname(String token) {
        return payload(token).get("nickname", String.class);
    }

    public long getAccessTokenExpireSeconds() {
        return accessTokenExpireSeconds;
    }

    public long getRefreshTokenExpireSeconds() {
        return refreshTokenExpireSeconds;
    }
}