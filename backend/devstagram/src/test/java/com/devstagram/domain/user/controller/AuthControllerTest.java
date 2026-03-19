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

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // 각 테스트 후 롤백되어 DB가 깨끗하게 유지됩니다.
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void init() {
        // @Transactional이 있어도 혹시 모를 데이터 간섭을 방지하기 위해 초기화합니다.
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("회원가입 성공 - 200-S-1 반환 확인")
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
                .andDo(print());
    }

    @Test
    @DisplayName("로그인 성공 - 쿠키(accessToken, apiKey) 발급 확인")
    void loginTest() throws Exception {
        // Given: 먼저 회원가입 처리 (회원가입 로직 재사용 대신 직접 DB 저장도 가능하지만 흐름 테스트를 위해 사용)
        saveTestUser("test@test.com", "dohwan");

        String loginRequest = """
                {
                    "email": "test@test.com",
                    "password": "password123!"
                }
                """;

        // When
        ResultActions resultActions =
                mvc.perform(post("/api/auth/login").content(loginRequest).contentType(MediaType.APPLICATION_JSON));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(cookie().exists("accessToken"))
                .andExpect(cookie().exists("apiKey"))
                .andExpect(jsonPath("$.msg").value("로그인 성공"))
                .andDo(print());
    }

    @Test
    @DisplayName("내 정보 조회 - 유효한 쿠키 전달 시 성공")
    void meTest() throws Exception {
        // Given: 사용자 생성 및 로그인 수행하여 쿠키 추출
        saveTestUser("test@test.com", "dohwan");

        MvcResult loginResult = mvc.perform(post("/api/auth/login")
                        .content("{\"email\":\"test@test.com\",\"password\":\"password123!\"}")
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        Cookie accessCookie = loginResult.getResponse().getCookie("accessToken");
        Cookie apiCookie = loginResult.getResponse().getCookie("apiKey");

        // When: 발급받은 쿠키와 함께 /me 호출
        ResultActions resultActions =
                mvc.perform(get("/api/auth/me").cookie(accessCookie).cookie(apiCookie));

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
        /*
         * 핵심 포인트: CustomAuthenticationFilter에서 인증 정보가 없으면
         * 401-F-2 ("로그인 후 이용해주세요.") 에러를 던지도록 설계되어 있습니다.
         */

        // When: 쿠키나 헤더 없이 호출
        ResultActions resultActions = mvc.perform(get("/api/auth/me"));

        // Then
        resultActions
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.resultCode").value("401-F-2")) // 필터의 에러 코드와 매칭
                .andDo(print());
    }

    // 테스트용 헬퍼 메서드: 매번 회원가입 API를 부르는 대신 직접 회원가입을 수행하여 테스트 속도 향상
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
