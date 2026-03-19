package com.devstagram.global.security;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

/**
 * STOMP CONNECT 시점에 Authorization 헤더(Bearer JWT)를 읽어 SecurityContext 를 세팅한다.
 *
 * 클라이언트는 STOMP CONNECT native header 로 다음 중 하나를 보내면 된다.
 * - Authorization: Bearer <accessToken>
 * - accessToken: <accessToken>
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;
    private final UserSecurityService userSecurityService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT != accessor.getCommand()) return message;

        String token = extractToken(accessor);
        if (token == null || token.isBlank()) return message;

        if (!jwtProvider.isValid(token)) return message;

        Claims payload = jwtProvider.payload(token);
        Long userId = Long.parseLong(payload.getSubject());

        User user = userSecurityService.findById(userId);
        SecurityUser securityUser = userSecurityService.toSecurityUser(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                securityUser, securityUser.getPassword(), securityUser.getAuthorities());

        accessor.setUser(authentication);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String raw = authHeaders.get(0);
            if (raw != null && raw.startsWith("Bearer ")) {
                return raw.substring(7).trim();
            }
        }

        List<String> tokens = accessor.getNativeHeader("accessToken");
        if (tokens != null && !tokens.isEmpty()) {
            return tokens.get(0);
        }

        return null;
    }
}
