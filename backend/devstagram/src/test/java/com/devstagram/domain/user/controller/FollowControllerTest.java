package com.devstagram.domain.user.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.security.RateLimitService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;

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

    @MockitoBean
    private RateLimitService rateLimitService;

    @Autowired
    private UserRepository userRepository;

    private Cookie authCookie;
    private String myApiKey; // 내 원본 API Key (ID.UUID) 저장
    private User me;
    private User otherUser;

    @BeforeEach
    void init() throws Exception {
        given(rateLimitService.isAllowed(anyString(), anyLong(), any())).willReturn(true);

        userRepository.deleteAll();

        // 1. 내 계정 생성 및 '원본 API Key'와 '쿠키' 획득
        SignupRequest mySignup = new SignupRequest(
                "myNickname",
                "me@test.com",
                "password123!",
                LocalDate.of(1000, 1, 1),
                Gender.MALE,
                "https://github.com/myNickname",
                Resume.UNDERGRADUATE);

        MvcResult signupResult = mvc.perform(post("/api/auth/signup")
                        .content(objectMapper.writeValueAsString(mySignup))
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // 응답에서 원본 API Key 추출 (필터 검증 테스트용)
        String body = signupResult.getResponse().getContentAsString();
        myApiKey = JsonPath.read(body, "$.data.apiKey");

        me = userRepository.findByEmailAndIsDeletedFalse("me@test.com").orElseThrow();
        authCookie = loginAndGetCookie("me@test.com", "password123!");

        // 2. 팔로우 대상 유저 생성
        otherUser = saveUser("other@test.com", "otherNickname");
    }

    @Test
    @DisplayName("팔로우 성공 테스트 - 쿠키 인증 사용")
    void followSuccess() throws Exception {
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                // [추가] 데이터 필드 검증
                .andExpect(jsonPath("$.data.toUserId").value(otherUser.getId()))
                .andExpect(jsonPath("$.data.isFollowing").value(true))
                .andExpect(jsonPath("$.data.followerCount").value(1)) // 상대방 팔로워 1명 증가 확인
                .andExpect(jsonPath("$.data.followingCount").value(1)) // 내 팔로잉 1명 증가 확인
                .andDo(print());
    }

    @Test
    @DisplayName("자기 자신을 팔로우할 경우 400-F-1 에러 발생")
    void followSelfFail() throws Exception {
        mvc.perform(post("/api/follows/" + me.getId()).cookie(authCookie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value("400-F-1"))
                .andDo(print());
    }

    @Test
    @DisplayName("이미 팔로우한 유저를 중복 팔로우할 경우 400-F-2 에러 발생")
    void duplicateFollowFail() throws Exception {
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value("400-F-2"))
                .andDo(print());
    }

    @Test
    @DisplayName("언팔로우 성공 테스트")
    void unfollowSuccess() throws Exception {
        // 먼저 팔로우 상태로 만듦
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // 언팔로우 실행 및 응답 데이터 검증
        mvc.perform(delete("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("언팔로우가 완료되었습니다."))
                // 언팔로우 후 상태와 카운트가 0이 되었는지 확인
                .andExpect(jsonPath("$.data.isFollowing").value(false))
                .andExpect(jsonPath("$.data.followerCount").value(0))
                .andExpect(jsonPath("$.data.followingCount").value(0))
                .andDo(print());
    }

    @Test
    @DisplayName("언팔로우 멱등 — 이미 관계 없을 때도 200 및 isFollowing false")
    void unfollowIdempotentWhenNotFollowing() throws Exception {
        mvc.perform(delete("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isFollowing").value(false))
                .andExpect(jsonPath("$.data.followerCount").value(0))
                .andExpect(jsonPath("$.data.followingCount").value(0));
    }

    @Test
    @DisplayName("언팔로우 후 status=false 이어야 한다")
    void unfollowThenStatusFalse() throws Exception {
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isFollowing").value(false));

        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));
    }

    @Test
    @DisplayName("팔로워/팔로잉 수 조회 테스트")
    void countTest() throws Exception {
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        mvc.perform(get("/api/follows/" + otherUser.getId() + "/follower-count").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));

        mvc.perform(get("/api/follows/" + me.getId() + "/following-count").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("팔로잉 목록 조회 테스트")
    void getFollowingsTest() throws Exception {
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        mvc.perform(get("/api/follows/" + me.getId() + "/followings").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].nickname").value("otherNickname"))
                .andExpect(jsonPath("$.data[0].profileImageUrl").exists())
                .andExpect(jsonPath("$.data[0].isFollowing").value(true))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로워 목록 조회 테스트")
    void getFollowersTest() throws Exception {
        User thirdUser = saveUser("third@test.com", "thirdUser");
        Cookie thirdCookie = loginAndGetCookie("third@test.com", "password123!");
        mvc.perform(post("/api/follows/" + me.getId()).cookie(thirdCookie));

        mvc.perform(get("/api/follows/" + me.getId() + "/followers").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nickname").value("thirdUser"))
                .andExpect(jsonPath("$.data[0].isFollowing").value(false))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로우 여부 확인 테스트")
    void isFollowingTest() throws Exception {
        // 비팔로우 상태 확인
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));

        // 팔로우 실행
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        // 팔로우 상태 확인
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status").cookie(authCookie))
                .andExpect(status().isOk())
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

        mvc.perform(post("/api/auth/signup")
                .content(objectMapper.writeValueAsString(request))
                .contentType(MediaType.APPLICATION_JSON));

        return userRepository.findByEmailAndIsDeletedFalse(email).orElseThrow();
    }

    private Cookie loginAndGetCookie(String email, String password) throws Exception {
        String loginJson = String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);
        MvcResult result = mvc.perform(
                        post("/api/auth/login").content(loginJson).contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        return result.getResponse().getCookie("accessToken");
    }
}
