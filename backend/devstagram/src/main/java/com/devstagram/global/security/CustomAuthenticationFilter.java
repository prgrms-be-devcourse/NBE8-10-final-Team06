package com.devstagram.global.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.rsdata.RsData;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CustomAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final UserSecurityService userSecurityService;
    private final Rq rq;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder; // BCrypt 비교를 위해 추가

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();

        if (!uri.startsWith("/api/")) {
            if (uri.startsWith("/actuator")) return true;
            return true;
        }

        // 로그인& 회원가입 뿐만 아니라 이메일&닉네임 중복 체크도 허용해줌
        if (uri.equals("/api/auth/login")
                || uri.equals("/api/auth/signup")
                || uri.equals("/api/auth/check-email")
                || uri.equals("/api/auth/check-nickname")) {
            return true;
        }

        if (uri.startsWith("/v3/api-docs")) return true;
        if (uri.startsWith("/swagger-ui")) return true;
        if (uri.startsWith("/h2-console")) return true;

        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            work();
            filterChain.doFilter(request, response);
        } catch (ServiceException e) {
            writeErrorResponse(response, e);
        }
    }

    private void work() {
        String apiKey = "";
        String accessToken = "";

        String authorization = rq.getHeader("Authorization", "");

        if (!authorization.isBlank()) {
            if (!authorization.startsWith("Bearer ")) {
                throw new ServiceException("401-F-1", "Authorization 헤더 형식이 올바르지 않습니다.");
            }

            String[] bits = authorization.split(" ", 2);
            if (bits.length == 2) {
                accessToken = bits[1].trim();
            }
        } else {
            accessToken = rq.getCookieValue("accessToken", "");
        }

        apiKey = rq.getHeader("X-API-KEY", "");
        if (apiKey.isBlank()) {
            apiKey = rq.getCookieValue("apiKey", "");
        }

        // 1. accessToken 우선 인증
        if (!accessToken.isBlank() && jwtProvider.isValid(accessToken)) {
            Claims payload = jwtProvider.payload(accessToken);
            Long userId = Long.parseLong(payload.getSubject());

            User user = userSecurityService.findById(userId);
            setAuthentication(user);
            return;
        }

        // 2. accessToken 실패 또는 없음 -> apiKey 인증
        if (!apiKey.isBlank()) {
            try {
                // "유저ID.UUID" 형식 분리
                String[] bits = apiKey.split("\\.", 2);
                if (bits.length != 2) {
                    throw new ServiceException("401-F-1", "유효하지 않은 API Key 형식입니다.");
                }

                Long userId = Long.parseLong(bits[0]); // 앞부분: ID
                String rawUuid = bits[1]; // 뒷부분: 원본 UUID

                // ID로 유저 먼저 찾기 (광속 조회)
                User user = userSecurityService.findById(userId);

                // DB에 저장된 해싱된 API Key와 사용자가 보낸 원본 UUID 비교
                if (!passwordEncoder.matches(rawUuid, user.getApiKey())) {
                    throw new ServiceException("401-F-1", "API Key가 일치하지 않습니다.");
                }

                // 인증 성공 시 세팅
                setAuthentication(user);

                // 새 accessToken 발급 및 쿠키 세팅
                String newAccessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());
                rq.setCookie("accessToken", newAccessToken);

                return;
            } catch (ServiceException e) {
                throw e;
            } catch (Exception e) {
                throw new ServiceException("401-F-2", "로그인 후 이용해주세요.");
            }
        }

        // 3. 둘 다 실패
        throw new ServiceException("401-F-2", "로그인 후 이용해주세요.");
    }

    private void setAuthentication(User user) {
        SecurityUser securityUser = userSecurityService.toSecurityUser(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                securityUser, securityUser.getPassword(), securityUser.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void writeErrorResponse(HttpServletResponse response, ServiceException e) throws IOException {
        int status = extractStatus(e.getResultCode());

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter()
                .write(objectMapper.writeValueAsString(new RsData<Void>(e.getResultCode(), e.getMsg(), null)));
    }

    private int extractStatus(String resultCode) {
        try {
            return Integer.parseInt(resultCode.substring(0, 3));
        } catch (Exception e) {
            return 500;
        }
    }
}
