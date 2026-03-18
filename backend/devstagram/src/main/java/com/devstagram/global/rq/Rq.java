package com.devstagram.global.rq;

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

    public void setCookie(String name, String value) {
        setCookie(name, value, 60 * 60);
    }

    public void setCookie(String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }

    public void deleteCookie(String name) {
        Cookie cookie = new Cookie(name, null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
