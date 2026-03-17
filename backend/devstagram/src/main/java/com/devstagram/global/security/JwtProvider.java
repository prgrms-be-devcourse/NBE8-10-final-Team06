package com.devstagram.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpireSeconds;

    public JwtProvider(
            @Value("${custom.jwt.secret-key}") String secretKey,
            @Value("${custom.jwt.access-token-expire-seconds}") long accessTokenExpireSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpireSeconds = accessTokenExpireSeconds;
    }

    public String genAccessToken(Long id, String email, String nickname) {
        Date now = new Date();
        Date expiredAt = new Date(now.getTime() + accessTokenExpireSeconds * 1000);

        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("email", email)
                .claim("nickname", nickname)
                .issuedAt(now)
                .expiration(expiredAt)
                .signWith(secretKey)
                .compact();
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    public String getEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    public String getNickname(String token) {
        return getClaims(token).get("nickname", String.class);
    }
}