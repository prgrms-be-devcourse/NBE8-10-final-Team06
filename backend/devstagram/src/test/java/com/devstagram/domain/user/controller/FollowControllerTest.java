package com.devstagram.domain.user.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FollowControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private Cookie authCookie;
    private User me;
    private User otherUser;

    @BeforeEach
    void init() throws Exception {
        userRepository.deleteAll();

        // 1. 내 계정 생성 및 로그인 쿠키 획득
        me = saveUser("me@test.com", "myNickname");
        authCookie = loginAndGetCookie("me@test.com", "password123!");

        // 2. 팔로우 대상 유저 생성
        otherUser = saveUser("other@test.com", "otherNickname");
    }

    @Test
    @DisplayName("팔로우 성공 테스트")
    void followSuccess() throws Exception {
        // When
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("팔로우가 완료되었습니다."))
                .andDo(print());
    }

    @Test
    @DisplayName("자기 자신을 팔로우할 경우 400-F-1 에러 발생")
    void followSelfFail() throws Exception {
        // When
        mvc.perform(post("/api/follows/" + me.getId()).cookie(authCookie))
                // Then
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value("400-F-1"))
                .andExpect(jsonPath("$.msg").value("자기 자신을 팔로우할 수 없습니다."))
                .andDo(print());
    }

    @Test
    @DisplayName("이미 팔로우한 유저를 중복 팔로우할 경우 400-F-2 에러 발생")
    void duplicateFollowFail() throws Exception {
        // Given: 먼저 팔로우를 한 번 수행
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // When: 다시 팔로우 시도
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie))
                // Then
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value("400-F-2"))
                .andDo(print());
    }

    @Test
    @DisplayName("언팔로우 성공 테스트")
    void unfollowSuccess() throws Exception {
        // Given: 팔로우 상태여야 함
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // When
        mvc.perform(delete("/api/follows/" + otherUser.getId()).cookie(authCookie))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("언팔로우가 완료되었습니다."))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로워/팔로잉 수 조회 테스트")
    void countTest() throws Exception {
        // Given: '나'가 '상대방'을 팔로우
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // When & Then: 상대방의 팔로워 수 확인 (인증 쿠키 추가)
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/follower-count").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));

        // When & Then: 나의 팔로잉 수 확인 (인증 쿠키 추가)
        mvc.perform(get("/api/follows/" + me.getId() + "/following-count").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("팔로잉 목록 조회 테스트 - 내가 팔로우한 사람들의 목록이 나와야 함")
    void getFollowingsTest() throws Exception {
        // Given: '나'가 '상대방'을 팔로우
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // When: 나의 팔로잉 목록 조회
        ResultActions resultActions = mvc.perform(get("/api/follows/" + me.getId() + "/followings")
                .cookie(authCookie)); // 인증 쿠키 필수!

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].nickname").value("otherNickname"))
                .andExpect(jsonPath("$.data[0].id").value(otherUser.getId().intValue()))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로워 목록 조회 테스트 - 나를 팔로우한 사람들의 목록이 나와야 함")
    void getFollowersTest() throws Exception {
        // Given: '상대방'이 '나'를 팔로우하게 함
        // (상대방으로 로그인하기 번거로우니, Repository를 사용하거나 다른 테스트 유저를 생성)
        User thirdUser = saveUser("third@test.com", "thirdUser");
        Cookie thirdCookie = loginAndGetCookie("third@test.com", "password123!");

        mvc.perform(post("/api/follows/" + me.getId()).cookie(thirdCookie));

        // When: 나의 팔로워 목록 조회
        ResultActions resultActions = mvc.perform(get("/api/follows/" + me.getId() + "/followers")
                .cookie(authCookie));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].nickname").value("thirdUser"))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로우 여부 확인 테스트")
    void isFollowingTest() throws Exception {
        // Given: 팔로우 전 상태
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status")
                        .cookie(authCookie))
                .andExpect(jsonPath("$.data").value(false));

        // When: 팔로우 실행
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // Then: 팔로우 후 상태 확인
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status")
                        .cookie(authCookie))
                .andExpect(jsonPath("$.data").value(true));
    }

    // --- Helper Methods ---

    private User saveUser(String email, String nickname) throws Exception {
        SignupRequest request = new SignupRequest(
                nickname,
                email,
                "password123!",
                LocalDate.of(1000, 1, 1),
                Gender.MALE,
                "https://github.com/" + nickname,
                Resume.UNDERGRADUATE);
        // AuthService를 직접 써도 되지만, API 흐름을 보장하기 위해 mvc 사용
        mvc.perform(post("/api/auth/signup")
                .content(objectMapper.writeValueAsString(request))
                .contentType(MediaType.APPLICATION_JSON));

        return userRepository.findByEmail(email).orElseThrow();
    }

    private Cookie loginAndGetCookie(String email, String password) throws Exception {
        String loginJson = String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);
        MvcResult result = mvc.perform(
                        post("/api/auth/login").content(loginJson).contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        return result.getResponse().getCookie("accessToken");
    }
}
