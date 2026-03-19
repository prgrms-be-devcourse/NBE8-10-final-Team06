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
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
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

    @Autowired
    private UserRepository userRepository;

    private Cookie authCookie;
    private String myApiKey; // 내 원본 API Key (ID.UUID) 저장
    private User me;
    private User otherUser;

    @BeforeEach
    void init() throws Exception {
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

        me = userRepository.findByEmail("me@test.com").orElseThrow();
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
                .andExpect(jsonPath("$.msg").value("팔로우가 완료되었습니다."))
                .andDo(print());
    }

    @Test
    @DisplayName("API Key 헤더를 이용한 팔로우 성공 테스트 - 해싱 로직 검증")
    void followWithApiKeySuccess() throws Exception {
        // 쿠키 없이 헤더의 X-API-KEY(ID.UUID)만 사용하여 팔로우 시도
        mvc.perform(post("/api/follows/" + otherUser.getId()).header("X-API-KEY", myApiKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
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
        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        mvc.perform(delete("/api/follows/" + otherUser.getId()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("언팔로우가 완료되었습니다."))
                .andDo(print());
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
                .andDo(print());
    }

    @Test
    @DisplayName("팔로워 목록 조회 테스트")
    void getFollowersTest() throws Exception {
        // 제3자가 나를 팔로우
        User thirdUser = saveUser("third@test.com", "thirdUser");
        Cookie thirdCookie = loginAndGetCookie("third@test.com", "password123!");

        mvc.perform(post("/api/follows/" + me.getId()).cookie(thirdCookie));

        mvc.perform(get("/api/follows/" + me.getId() + "/followers").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nickname").value("thirdUser"))
                .andDo(print());
    }

    @Test
    @DisplayName("팔로우 여부 확인 테스트")
    void isFollowingTest() throws Exception {
        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status").cookie(authCookie))
                .andExpect(jsonPath("$.data").value(false));

        mvc.perform(post("/api/follows/" + otherUser.getId()).cookie(authCookie));

        mvc.perform(get("/api/follows/" + otherUser.getId() + "/status").cookie(authCookie))
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
