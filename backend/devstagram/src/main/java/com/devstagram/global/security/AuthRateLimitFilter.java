package com.devstagram.global.security;

import java.io.IOException;
import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.global.rsdata.RsData;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * 인증 관련 API(로그인, 회원가입 등)의 과도한 요청을 제한하는 필터
 * Redis 등을 활용한 RateLimitService를 사용하여 IP 및 이메일별 요청 횟수를 체크함
 */
@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    private static final Duration WINDOW = Duration.ofMinutes(1);

    // 각 기능별 제한 횟수 설정 (1분당 기준)
    private static final long LOGIN_IP_LIMIT = 10;
    private static final long LOGIN_EMAIL_LIMIT = 5;

    private static final long SIGNUP_IP_LIMIT = 5;

    private static final long CHECK_EMAIL_IP_LIMIT = 30;
    private static final long CHECK_NICKNAME_IP_LIMIT = 30;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // 로그인, 회원가입, 중복 확인 API가 아니면 이 필터를 통과(Skip) 시킴
        String uri = request.getRequestURI();
        String method = request.getMethod();

        boolean isLogin = "POST".equalsIgnoreCase(method) && "/api/auth/login".equals(uri);
        boolean isSignup = "POST".equalsIgnoreCase(method) && "/api/auth/signup".equals(uri);
        boolean isCheckEmail = "GET".equalsIgnoreCase(method) && "/api/auth/check-email".equals(uri);
        boolean isCheckNickname = "GET".equalsIgnoreCase(method) && "/api/auth/check-nickname".equals(uri);

        return !(isLogin || isSignup || isCheckEmail || isCheckNickname);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        String clientIp = getClientIp(request);

        // 1. 이메일/닉네임 중복 확인 제한 (IP 기준)
        if ("/api/auth/check-email".equals(uri)) {
            if (!rateLimitService.isAllowed("check-email:ip:" + clientIp, CHECK_EMAIL_IP_LIMIT, WINDOW)) {
                writeTooManyRequests(response, "이메일 중복 확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        if ("/api/auth/check-nickname".equals(uri)) {
            if (!rateLimitService.isAllowed("check-nickname:ip:" + clientIp, CHECK_NICKNAME_IP_LIMIT, WINDOW)) {
                writeTooManyRequests(response, "닉네임 중복 확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        // 로그인/회원가입은 Request Body를 읽어야 하므로 캐싱된 래퍼 사용
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);

        // 2. 로그인 제한 (IP + 이메일 계정 이중 체크)
        if ("/api/auth/login".equals(uri)) {
            if (!rateLimitService.isAllowed("login:ip:" + clientIp, LOGIN_IP_LIMIT, WINDOW)) {
                writeTooManyRequests(response, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // 계정(Email) 기준 체크: 특정 계정을 탈취하려는 시도 차단
            String email = extractLoginEmail(wrappedRequest);
            if (email != null && !email.isBlank()) {
                if (!rateLimitService.isAllowed("login:email:" + email.toLowerCase(), LOGIN_EMAIL_LIMIT, WINDOW)) {
                    writeTooManyRequests(response, "해당 계정의 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                    return;
                }
            }

            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        // 3. 회원가입 제한 (IP 기준)
        if ("/api/auth/signup".equals(uri)) {
            if (!rateLimitService.isAllowed("signup:ip:" + clientIp, SIGNUP_IP_LIMIT, WINDOW)) {
                writeTooManyRequests(response, "회원가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            filterChain.doFilter(wrappedRequest, response);
        }
    }

    private String extractLoginEmail(CachedBodyHttpServletRequest request) {
        try {
            LoginRequest loginRequest = objectMapper.readValue(request.getInputStream(), LoginRequest.class);
            return loginRequest.email();
        } catch (Exception e) {
            return null;
        }
    }

    // 사용자 IP를 추출하는 코드
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // 요청 제한 초과 시 429(Too Many Requests) 에러 응답 전송
    private void writeTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        RsData<Void> body = new RsData<>("429-AUTH-1", message, null);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
