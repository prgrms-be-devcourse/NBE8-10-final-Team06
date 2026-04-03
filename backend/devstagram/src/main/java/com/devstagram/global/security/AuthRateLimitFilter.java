package com.devstagram.global.security;

import java.io.IOException;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
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
 *
 * 변경 포인트:
 * - 원래 하드코딩돼 있던 제한값을 application.yml / application-local.yml 등에서 주입받도록 변경
 * - local/perf 환경에서는 제한값을 크게 올리거나 enabled=false 로 끌 수 있음
 */
@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    /**
     * 인증 rate limit 사용 여부
     * true  -> 필터 동작
     * false -> 필터 전체 스킵
     */
    @Value("${custom.rate-limit.auth.enabled:true}")
    private boolean authRateLimitEnabled;

    /**
     * rate limit 윈도우 길이(초)
     * 예: 60이면 1분 기준
     */
    @Value("${custom.rate-limit.auth.window-seconds:60}")
    private long windowSeconds;

    /**
     * 로그인 IP 기준 제한 횟수
     */
    @Value("${custom.rate-limit.auth.login-ip-limit:10}")
    private long loginIpLimit;

    /**
     * 로그인 이메일 기준 제한 횟수
     */
    @Value("${custom.rate-limit.auth.login-email-limit:5}")
    private long loginEmailLimit;

    /**
     * 회원가입 IP 기준 제한 횟수
     */
    @Value("${custom.rate-limit.auth.signup-ip-limit:5}")
    private long signupIpLimit;

    /**
     * 이메일 중복확인 IP 기준 제한 횟수
     */
    @Value("${custom.rate-limit.auth.check-email-ip-limit:30}")
    private long checkEmailIpLimit;

    /**
     * 닉네임 중복확인 IP 기준 제한 횟수
     */
    @Value("${custom.rate-limit.auth.check-nickname-ip-limit:30}")
    private long checkNicknameIpLimit;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // local/perf 등에서 아예 비활성화하고 싶을 때 사용
        if (!authRateLimitEnabled) {
            return true;
        }

        // 로그인, 회원가입, 중복 확인 API가 아니면 이 필터를 스킵
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

        Duration window = Duration.ofSeconds(windowSeconds);

        String uri = request.getRequestURI();
        String clientIp = getClientIp(request);

        // 1. 이메일 중복 확인 제한 (IP 기준)
        if ("/api/auth/check-email".equals(uri)) {
            if (!rateLimitService.isAllowed("check-email:ip:" + clientIp, checkEmailIpLimit, window)) {
                writeTooManyRequests(response, "이메일 중복 확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        // 2. 닉네임 중복 확인 제한 (IP 기준)
        if ("/api/auth/check-nickname".equals(uri)) {
            if (!rateLimitService.isAllowed("check-nickname:ip:" + clientIp, checkNicknameIpLimit, window)) {
                writeTooManyRequests(response, "닉네임 중복 확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        // 로그인/회원가입은 body를 읽어야 하므로 래핑
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);

        // 3. 로그인 제한 (IP + 이메일 기준)
        if ("/api/auth/login".equals(uri)) {
            // IP 기준 제한
            if (!rateLimitService.isAllowed("login:ip:" + clientIp, loginIpLimit, window)) {
                writeTooManyRequests(response, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // 이메일 기준 제한
            String email = extractLoginEmail(wrappedRequest);
            if (email != null && !email.isBlank()) {
                if (!rateLimitService.isAllowed("login:email:" + email.toLowerCase(), loginEmailLimit, window)) {
                    writeTooManyRequests(response, "해당 계정의 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                    return;
                }
            }

            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        // 4. 회원가입 제한 (IP 기준)
        if ("/api/auth/signup".equals(uri)) {
            if (!rateLimitService.isAllowed("signup:ip:" + clientIp, signupIpLimit, window)) {
                writeTooManyRequests(response, "회원가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            filterChain.doFilter(wrappedRequest, response);
        }
    }

    /**
     * 로그인 요청 body에서 이메일 추출
     */
    private String extractLoginEmail(CachedBodyHttpServletRequest request) {
        try {
            LoginRequest loginRequest = objectMapper.readValue(request.getInputStream(), LoginRequest.class);
            return loginRequest.email();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 사용자 IP 추출
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * 429 응답 작성
     */
    private void writeTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        RsData<Void> body = new RsData<>("429-AUTH-1", message, null);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
