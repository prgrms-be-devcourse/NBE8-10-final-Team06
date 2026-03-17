package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // 테스트용 설정을 따로 쓴다면 (없어도 무관)
@Transactional // 테스트 후 DB 롤백을 위해 필수
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @BeforeEach
    void init() {
        // 테스트 전 DB 초기화가 필요하다면 수행
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("회원가입 성공 테스트")
    void signupTest() throws Exception {
        // Given
        SignupRequest signupRequest = new SignupRequest(
                "dohwan",
                "test@test.com",
                "password123!",
                LocalDate.of(2000, 1, 1),
                Gender.MALE,
                "https://github.com/dohwa",
                Resume.UNDERGRADUATE
        );

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
    @DisplayName("로그인 성공 시 쿠키가 발급되어야 한다")
    void loginTest() throws Exception {
        // Given (회원가입 먼저 수행)
        signupTest();

        String loginRequest = """
                {
                    "email": "test@test.com",
                    "password": "password123!"
                }
                """;

        // When
        ResultActions resultActions = mvc.perform(post("/api/auth/login")
                .content(loginRequest)
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(cookie().exists("accessToken"))
                .andExpect(cookie().exists("apiKey"))
                .andExpect(jsonPath("$.msg").value("로그인 성공"))
                .andDo(print());
    }

    @Test
    @DisplayName("쿠키 인증을 통한 내 정보 조회")
    void meTest() throws Exception {
        // Given (회원가입 및 로그인하여 쿠키 확보)
        signupTest();

        // 실제 로그인을 통해 응답에서 쿠키를 받아옴
        MvcResult loginResult = mvc.perform(post("/api/auth/login")
                        .content("{\"email\":\"test@test.com\",\"password\":\"password123!\"}")
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        Cookie accessCookie = loginResult.getResponse().getCookie("accessToken");
        Cookie apiCookie = loginResult.getResponse().getCookie("apiKey");

        // When (쿠키를 포함하여 /me 호출)
        ResultActions resultActions = mvc.perform(get("/api/auth/me")
                .cookie(accessCookie)
                .cookie(apiCookie));

        // Then
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("dohwan"))
                .andExpect(jsonPath("$.data.email").value("test@test.com"))
                .andDo(print());
    }

    @Test
    @DisplayName("인증 없이 내 정보 조회 시 401 에러 발생")
    void meFailTest() throws Exception {
        // When (쿠키 없이 호출)
        ResultActions resultActions = mvc.perform(get("/api/auth/me"));

        // Then (사용자님이 만든 401 에러가 터져야 함)
        resultActions
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.resultCode").value("401-F-2"))
                .andDo(print());
    }
}