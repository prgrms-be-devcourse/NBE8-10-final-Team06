package com.devstagram.global.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();

        if (!uri.startsWith("/api/")) {
            return true;
        }

        if (uri.equals("/api/auth/login")
                || uri.equals("/api/auth/signup")
                || uri.equals("/api/auth/check-email")
                || uri.equals("/api/auth/check-nickname")
                || uri.equals("/api/auth/refresh")) {
            return true;
        }

        if (uri.startsWith("/v3/api-docs")
                || uri.startsWith("/swagger-ui")
                || uri.startsWith("/h2-console")
                || uri.startsWith("/actuator")) {
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

        if (!authorization.isBlank()) {
            if (!authorization.startsWith("Bearer ")) {
                throw new ServiceException("401-F-1", "Authorization 헤더 형식이 올바르지 않습니다.");
            }
            accessToken = authorization.split(" ", 2)[1].trim();
        }

        if (accessToken.isBlank()) {
            accessToken = rq.getCookieValue("accessToken", "");
        }

        if (accessToken.isBlank()) {
            return;
        }

        if (!jwtProvider.isValid(accessToken) || !jwtProvider.isAccessToken(accessToken)) {
            throw new ServiceException("401-F-1", "유효하지 않은 액세스 토큰입니다.");
        }

        Claims payload = jwtProvider.payload(accessToken);
        Long userId = Long.parseLong(payload.getSubject());
        User user = userSecurityService.findById(userId);
        setAuthentication(user);
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