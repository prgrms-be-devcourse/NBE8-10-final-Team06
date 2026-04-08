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
 * 클라이언트 인바운드 STOMP 프레임마다 실행되는 채널 인터셉터.
 *
 * CONNECT: native 헤더의 JWT 로 사용자를 조회해 {@link StompHeaderAccessor#setUser} 및
 * 당시 스레드의 {@link SecurityContextHolder} 에 넣는다. 이후 WebSocket 세션에 principal 이 유지된다.
 *
 *
 * SEND / SUBSCRIBE 등 비-CONNECT: CONNECT 와 다른 스레드에서 처리될 수 있고
 * {@code SecurityContextHolder} 는 스레드 로컬이므로, 비어 있으면
 * 세션에 붙어 있는 {@link StompHeaderAccessor#getUser()} 를 다시 현재 스레드 컨텍스트에 복사한다
 * ({@link #applySecurityFromSessionUser}).
 *
 *
 * 프레임 처리가 끝나면 {@link #afterSendCompletion} 에서 {@link SecurityContextHolder#clearContext()} 로
 * 스레드 풀 재사용 시 인증 누수를 막는다.
 *
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

    /**
     * CONNECT 이면 JWT 로 principal 을 만들고 세션·현재 스레드에 심는다.
     * 그 외 명령(SEND 등)이면 {@link #applySecurityFromSessionUser} 만 수행한다.
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        // CONNECT 가 아니면 JWT 재검증 없이, 이미 세션에 연결된 principal 만 현재 워커 스레드의 SecurityContext 에 맞춘다.
        if (StompCommand.CONNECT != accessor.getCommand()) {
            applySecurityFromSessionUser(accessor);
            return message;
        }

        String token = extractToken(accessor);
        if (token == null || token.isBlank()) {
            return message;
        }

        if (!jwtProvider.isValid(token)) {
            return message;
        }

        Claims payload = jwtProvider.payload(token);
        Long userId = Long.parseLong(payload.getSubject());

        User user = userSecurityService.findById(userId);
        SecurityUser securityUser = userSecurityService.toSecurityUser(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                securityUser, securityUser.getPassword(), securityUser.getAuthorities());

        // 이후 같은 WebSocket 세션의 SEND 등에서 StompHeaderAccessor#getUser() 로 꺼낼 수 있게 세션에 principal 고정
        accessor.setUser(authentication);
        // CONNECT 를 처리하는 이 스레드에서만 유효; 다음 프레임은 다른 스레드일 수 있음
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return message;
    }

    /**
     * 인바운드 메시지 한 건에 대한 채널 처리가 끝난 뒤 호출된다.
     * {@link #preSend} / {@link #applySecurityFromSessionUser} 가 채운 스레드 로컬 인증을 제거해,
     * 동일 Executor 스레드가 다른 사용자·다른 요청에 재배정될 때 컨텍스트가 섞이지 않게 한다.
     */
    @Override
    public void afterSendCompletion(Message<?> message, MessageChannel channel, boolean sent, Exception ex) {
        SecurityContextHolder.clearContext();
    }

    /**
     * STOMP CONNECT 시 {@link StompHeaderAccessor#setUser} 로 저장해 둔 {@link Authentication} 을
     * <strong>이번 프레임을 처리 중인 스레드</strong>의 {@link SecurityContextHolder} 에 복사한다.
     *
     * 세션에 Principal 이 없는 경우(CONNECT 시 미인증)에는 현재 SEND 프레임의
     * Authorization / accessToken 헤더로 재인증을 시도한다.
     * 재인증 성공 시 세션 Principal 도 갱신해 이후 프레임에서도 유효하게 한다.
     */
    private void applySecurityFromSessionUser(StompHeaderAccessor accessor) {
        if (accessor == null || accessor.getCommand() == null) {
            return;
        }
        if (accessor.getCommand() == StompCommand.CONNECT) {
            return;
        }
        Object principal = accessor.getUser();
        // CONNECT 시 setUser 해 둔 Authentication; 있으면 즉시 SecurityContext 복사
        if (principal instanceof Authentication authentication) {
            SecurityContextHolder.getContext().setAuthentication(authentication);
            return;
        }
        // 세션 Principal 없음(CONNECT 미인증): 현재 프레임 헤더의 토큰으로 재인증 시도
        authenticateFromFrameToken(accessor);
    }

    /**
     * SEND 등 비-CONNECT 프레임의 native 헤더에서 JWT 를 꺼내 인증한다.
     * 성공 시 SecurityContextHolder 와 세션 Principal 을 모두 설정한다.
     */
    private void authenticateFromFrameToken(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        if (token == null || token.isBlank()) {
            return;
        }
        if (!jwtProvider.isValid(token)) {
            return;
        }
        try {
            Claims payload = jwtProvider.payload(token);
            Long userId = Long.parseLong(payload.getSubject());
            User user = userSecurityService.findById(userId);
            SecurityUser securityUser = userSecurityService.toSecurityUser(user);
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    securityUser, securityUser.getPassword(), securityUser.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
            // 이후 같은 세션의 프레임에서도 재사용할 수 있도록 세션 Principal 갱신
            accessor.setUser(auth);
        } catch (Exception ignored) {
            // 인증 실패: SecurityContext 는 비어있는 상태로 유지
        }
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
