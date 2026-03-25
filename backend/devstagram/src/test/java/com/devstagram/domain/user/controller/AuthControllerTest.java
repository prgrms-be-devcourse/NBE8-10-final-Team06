package com.devstagram.domain.user.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.devstagram.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void init() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("회원가입 성공 - 원본 API Key(ID.UUID)가 응답에 포함되어야 함")
    void signupTest() throws Exception {
        // Given
        SignupRequest signupRequest = new SignupRequest(
                "dohwan",
                "test@test.com",
                "password123!",
                LocalDate.of(2000, 1, 1),
                Gender.MALE,
                "https://github.com/dohwa",
                Resume.UNDERGRADUATE);

        // When
        ResultActions resultActions = mvc.perform(post("/api/auth/signup")
                .content(objectMapper.writeValueAsString(signupRequest))
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data.nickname").value("dohwan"))
                .andExpect(jsonPath("$.data.apiKey").exists()) // 원본 키가 존재하는지 확인
                .andDo(print());
    }

    @Test
    @DisplayName("로그인 성공 - accessToken 쿠키 발급 확인 (apiKey 쿠키는 보안상 미발급)")
    void loginTest() throws Exception {
        // Given
        saveTestUser("test@test.com", "dohwan");

        String loginRequest = "{\"email\":\"test@test.com\",\"password\":\"password123!\"}";

        // When
        ResultActions resultActions =
                mvc.perform(post("/api/auth/login").content(loginRequest).contentType(MediaType.APPLICATION_JSON));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(cookie().exists("accessToken"))
                .andDo(print());
    }

    @Test
    @DisplayName("내 정보 조회 - 쿠키 인증으로 성공")
    void meTest() throws Exception {
        // 1. 회원가입 & 로그인하여 쿠키 획득
        saveTestUser("test2@test.com", "dohwa2");

        String loginRequest = "{\"email\":\"test2@test.com\",\"password\":\"password123!\"}";
        MvcResult loginResult = mvc.perform(
                        post("/api/auth/login").content(loginRequest).contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        jakarta.servlet.http.Cookie authCookie = loginResult.getResponse().getCookie("accessToken");

        // 2. 발급받은 쿠키를 들고 /me 호출
        mvc.perform(get("/api/auth/me").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("test2@test.com"))
                .andExpect(jsonPath("$.data.nickname").value("dohwa2"))
                .andDo(print());
    }

    @Test
    @DisplayName("내 정보 조회 실패 - 인증 정보가 없을 때 403 Forbidden 반환")
    void meFailTest() throws Exception {
        // When: 아무런 인증 정보 없이 호출
        ResultActions resultActions = mvc.perform(get("/api/auth/me"));

        // Then: 시큐리티 설정(.authenticated())에 의해 403 Forbidden 응답
        resultActions.andExpect(status().isForbidden()).andDo(print());
    }

    private void saveTestUser(String email, String nickname) throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                nickname,
                email,
                "password123!",
                LocalDate.of(2000, 1, 1),
                Gender.MALE,
                "https://github.com/dohwa",
                Resume.UNDERGRADUATE);

        mvc.perform(post("/api/auth/signup")
                .content(objectMapper.writeValueAsString(signupRequest))
                .contentType(MediaType.APPLICATION_JSON));
    }
}
