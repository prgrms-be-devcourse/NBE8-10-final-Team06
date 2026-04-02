package com.devstagram.global.security;

import java.io.IOException;
import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.devstagram.domain.user.dto.LoginRequest;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.global.rsdata.RsData;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private static final long LOGIN_IP_LIMIT = 10;
    private static final long LOGIN_EMAIL_LIMIT = 5;

    private static final long SIGNUP_IP_LIMIT = 5;

    private static final long CHECK_EMAIL_IP_LIMIT = 30;
    private static final long CHECK_NICKNAME_IP_LIMIT = 30;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        boolean isLogin = "POST".equalsIgnoreCase(method) && "/api/auth/login".equals(uri);
        boolean isSignup = "POST".equalsIgnoreCase(method) && "/api/auth/signup".equals(uri);
        boolean isCheckEmail = "GET".equalsIgnoreCase(method) && "/api/auth/check-email".equals(uri);
        boolean isCheckNickname = "GET".equalsIgnoreCase(method) && "/api/auth/check-nickname".equals(uri);

        return !(isLogin || isSignup || isCheckEmail || isCheckNickname);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String uri = request.getRequestURI();
        String clientIp = getClientIp(request);

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

        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);

        if ("/api/auth/login".equals(uri)) {
            if (!rateLimitService.isAllowed("login:ip:" + clientIp, LOGIN_IP_LIMIT, WINDOW)) {
                writeTooManyRequests(response, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

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

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        RsData<Void> body = new RsData<>("429-AUTH-1", message, null);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}