package com.devstagram.global.rq;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequestScope
@RequiredArgsConstructor
public class Rq {

    private final HttpServletRequest request;
    private final HttpServletResponse response;

    @Value("${custom.cookie.secure:false}")
    private boolean secure;

    @Value("${custom.cookie.same-site:Lax}")
    private String sameSite;

    public String getHeader(String name, String defaultValue) {
        String value = request.getHeader(name);
        return (value == null || value.isBlank()) ? defaultValue : value;
    }

    public String getCookieValue(String name, String defaultValue) {
        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            return defaultValue;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value == null || value.isBlank()) ? defaultValue : value;
            }
        }

        return defaultValue;
    }

    public void setCookie(String name, String value, int maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(maxAge)
                .sameSite(sameSite)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void deleteCookie(String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(0)
                .sameSite(sameSite)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
