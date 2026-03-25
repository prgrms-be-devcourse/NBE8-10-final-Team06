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
    private final PasswordEncoder passwordEncoder;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();

        // API가 아니거나 특정 경로는 필터링 생략
        if (!uri.startsWith("/api/")) {
            return true;
        }

        if (uri.equals("/api/auth/login")
                || uri.equals("/api/auth/signup")
                || uri.equals("/api/auth/check-email")
                || uri.equals("/api/auth/check-nickname")) {
            return true;
        }

        if (uri.startsWith("/v3/api-docs") || uri.startsWith("/swagger-ui") || uri.startsWith("/h2-console") || uri.startsWith("/actuator")) {
            return true;
        }

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
        String authorization = rq.getHeader("Authorization", "");
        String accessToken = "";

        // 1. Authorization 헤더 확인
        if (!authorization.isBlank()) {
            if (!authorization.startsWith("Bearer ")) {
                throw new ServiceException("401-F-1", "Authorization 헤더 형식이 올바르지 않습니다.");
            }
            accessToken = authorization.split(" ", 2)[1].trim();
        }

        // 2. 쿠키 확인 (헤더에 없을 경우)
        if (accessToken.isBlank()) {
            accessToken = rq.getCookieValue("accessToken", "");
        }

        String apiKey = rq.getHeader("X-API-KEY", "");
        if (apiKey.isBlank()) {
            apiKey = rq.getCookieValue("apiKey", "");
        }

        // 토큰과 API Key 둘 다 없다면 그냥 리턴 (판단은 SecurityConfig에게 맡김)
        if (accessToken.isBlank() && apiKey.isBlank()) {
            return;
        }

        // 3. accessToken 우선 인증
        if (!accessToken.isBlank()) {
            if (jwtProvider.isValid(accessToken)) {
                Claims payload = jwtProvider.payload(accessToken);
                Long userId = Long.parseLong(payload.getSubject());
                User user = userSecurityService.findById(userId);
                setAuthentication(user);
                return;
            }
            // 만약 토큰이 있는데 유효하지 않다면 에러를 던질 수 있음 (선택 사항)
        }

        // 4. apiKey 인증
        if (!apiKey.isBlank()) {
            try {
                String[] bits = apiKey.split("\\.", 2);
                if (bits.length != 2) throw new ServiceException("401-F-1", "유효하지 않은 API Key 형식입니다.");

                Long userId = Long.parseLong(bits[0]);
                String rawUuid = bits[1];

                User user = userSecurityService.findById(userId);

                if (!passwordEncoder.matches(rawUuid, user.getApiKey())) {
                    throw new ServiceException("401-F-1", "API Key가 일치하지 않습니다.");
                }

                setAuthentication(user);
                String newAccessToken = jwtProvider.genAccessToken(user.getId(), user.getEmail(), user.getNickname());
                rq.setCookie("accessToken", newAccessToken);
                return;
            } catch (ServiceException e) {
                throw e;
            } catch (Exception e) {
                throw new ServiceException("401-F-2", "로그인 후 이용해주세요.");
            }
        }

        // 5. 여기까지 왔는데 인증이 안 됐다면?
        // 보호된 API인 경우 SecurityConfig가 나중에 403을 띄울 것이므로 그냥 return 처리합니다.
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