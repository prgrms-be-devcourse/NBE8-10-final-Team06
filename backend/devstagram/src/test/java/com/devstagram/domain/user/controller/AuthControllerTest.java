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
import com.jayway.jsonpath.JsonPath;

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
    @DisplayName("내 정보 조회 - 발급받은 원본 API Key(ID.UUID)로 인증 성공")
    void meTest() throws Exception {
        // 1. 회원가입 시점에 발급되는 '원본 API Key'를 추출합니다.
        SignupRequest signupRequest = new SignupRequest(
                "dohwan",
                "test@test.com",
                "password123!",
                LocalDate.of(2000, 1, 1),
                Gender.MALE,
                "https://github.com/dohwa",
                Resume.UNDERGRADUATE);

        MvcResult signupResult = mvc.perform(post("/api/auth/signup")
                        .content(objectMapper.writeValueAsString(signupRequest))
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // 응답 JSON에서 apiKey(ID.UUID 형태) 추출
        String responseBody = signupResult.getResponse().getContentAsString();
        String publicApiKey = JsonPath.read(responseBody, "$.data.apiKey");

        // 2. [핵심] 쿠키 없이 헤더에 X-API-KEY만 담아서 요청 보냅니다.
        // 필터가 ID로 유저를 찾고 뒤의 UUID를 matches()로 검증하는지 확인하는 테스트입니다.
        ResultActions resultActions = mvc.perform(get("/api/auth/me").header("X-API-KEY", publicApiKey));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data.nickname").value("dohwan"))
                .andExpect(jsonPath("$.data.email").value("test@test.com"))
                .andDo(print());
    }

    @Test
    @DisplayName("내 정보 조회 실패 - 인증 정보가 없을 때 401-F-2 반환")
    void meFailTest() throws Exception {
        // When: 아무런 인증 정보 없이 호출
        ResultActions resultActions = mvc.perform(get("/api/auth/me"));

        // Then: 필터에서 401-F-2가 터져야 함
        resultActions
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.resultCode").value("401-F-2"))
                .andDo(print());
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
