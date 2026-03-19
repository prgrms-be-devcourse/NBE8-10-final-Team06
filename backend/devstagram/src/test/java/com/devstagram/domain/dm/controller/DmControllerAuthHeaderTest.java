package com.devstagram.domain.dm.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.devstagram.domain.dm.dto.DmRoomSummaryResponse;
import com.devstagram.domain.dm.service.DmService;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.security.CustomAuthenticationFilter;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.SecurityUser;
import com.devstagram.global.security.SecurityUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;

/**
 * "헤더에 유저(Authorization: Bearer ...)"를 넣었을 때
 * CustomAuthenticationFilter 가 SecurityContext 를 세팅하는지, 그리고 DM 컨트롤러가 그 값을 쓰는지 검증.
 */
class DmControllerAuthHeaderTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void customAuthFilter_setsSecurityContext_fromAuthorizationHeader() throws Exception {
        JwtProvider jwtProvider = mock(JwtProvider.class);
        UserSecurityService userSecurityService = mock(UserSecurityService.class);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/dm/rooms");
        request.addHeader("Authorization", "Bearer test-token");

        MockHttpServletResponse response = new MockHttpServletResponse();

        Rq rq = new Rq(request, response);
        ObjectMapper objectMapper = new ObjectMapper();

        CustomAuthenticationFilter filter = newFilter(jwtProvider, userSecurityService, rq, objectMapper);

        when(jwtProvider.isValid("test-token")).thenReturn(true);
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("1");
        when(jwtProvider.payload("test-token")).thenReturn(claims);

        User user = mock(User.class);
        when(userSecurityService.findById(1L)).thenReturn(user);

        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        when(userSecurityService.toSecurityUser(user)).thenReturn(securityUser);

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityUtil.getCurrentUserId()).isEqualTo(1L);
    }

    @Test
    void dmController_usesSecurityContextUserId() {
        DmService dmService = mock(DmService.class);
        DmController dmController = new DmController(dmService);

        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        securityUser, securityUser.getPassword(), securityUser.getAuthorities()));

        when(dmService.getRoomsWithLastMessage(eq(1L))).thenReturn(List.of());

        dmController.getRooms();

        verify(dmService).getRoomsWithLastMessage(1L);
    }

    @Test
    void dmController_getRooms_returnsRsDataSuccess() {
        DmService dmService = mock(DmService.class);
        DmController dmController = new DmController(dmService);

        SecurityUser securityUser = new SecurityUser(
                1L, "a@a.com", "nick", "apiKey", "pw", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(
                        securityUser, securityUser.getPassword(), securityUser.getAuthorities()));

        when(dmService.getRoomsWithLastMessage(eq(1L))).thenReturn(List.of());

        var rs = dmController.getRooms();

        assertThat(rs).isNotNull();
        assertThat(rs.isSuccess()).isTrue();
        assertThat(rs.data()).isEqualTo(List.<DmRoomSummaryResponse>of());
    }

    private CustomAuthenticationFilter newFilter(
            JwtProvider jwtProvider, UserSecurityService userSecurityService, Rq rq, ObjectMapper objectMapper) {
        try {
            for (Constructor<?> ctor : CustomAuthenticationFilter.class.getConstructors()) {
                if (ctor.getParameterCount() == 4) {
                    return (CustomAuthenticationFilter)
                            ctor.newInstance(jwtProvider, userSecurityService, rq, objectMapper);
                }
                if (ctor.getParameterCount() == 5) {
                    Object passwordEncoder = mock(ctor.getParameterTypes()[4]);
                    return (CustomAuthenticationFilter)
                            ctor.newInstance(jwtProvider, userSecurityService, rq, objectMapper, passwordEncoder);
                }
            }
            throw new IllegalStateException("지원 가능한 CustomAuthenticationFilter 생성자를 찾지 못했습니다.");
        } catch (Exception e) {
            throw new RuntimeException("CustomAuthenticationFilter 생성 실패", e);
        }
    }
}
