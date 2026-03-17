package com.devstagram.global.security;

import com.devstagram.global.exception.ServiceException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {

    public static SecurityUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof SecurityUser securityUser)) {
            throw new ServiceException("401-F-1", "로그인 후 이용해주세요.");
        }

        return securityUser;
    }

    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public static String getCurrentUserEmail() {
        return getCurrentUser().getEmail();
    }

    public static String getCurrentUserNickname() {
        return getCurrentUser().getNickname();
    }
}