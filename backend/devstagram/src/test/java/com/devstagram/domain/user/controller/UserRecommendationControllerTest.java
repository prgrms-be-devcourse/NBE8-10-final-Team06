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
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.technology.service.TechScoreService;
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
class UserRecommendationControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TechnologyRepository technologyRepository;

    @Autowired
    private TechCategoryRepository techCategoryRepository;

    @Autowired
    private TechScoreService techScoreService;

    private Cookie authCookie;
    private User me;
    private Technology javaTech;

    @BeforeEach
    void init() throws Exception {
        // 테스트마다 데이터 초기화
        userRepository.deleteAll();
        technologyRepository.deleteAll();
        techCategoryRepository.deleteAll();

        // 추천 테스트에 필요한 최소 기술 데이터만 생성
        TechCategory backend = techCategoryRepository.save(
                TechCategory.builder().name("Backend").color("#000000").build());

        javaTech = technologyRepository.save(Technology.builder()
                .name("Java")
                .category(backend)
                .color("#E76F00")
                .build());

        // 로그인 사용자 생성
        me = saveUser("me@test.com", "myNickname");
        authCookie = loginAndGetCookie("me@test.com", "password123!");
    }

    @Test
    @DisplayName("로그인 사용자는 비슷한 기술 벡터를 가진 사용자를 추천받는다")
    void getRecommendationsSuccess() throws Exception {
        // 추천 대상 사용자 생성
        User javaExpert = saveUser("expert@test.com", "JavaExpert");

        // 나와 추천 대상에게 같은 기술 점수를 부여
        techScoreService.increaseScore(me, javaTech, "POST");
        techScoreService.increaseScore(javaExpert, javaTech, "POST");

        // 추천 API 호출
        mvc.perform(get("/api/users/recommendations").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                // 추천 목록 첫 번째 사용자가 존재하는지만 기본 확인
                .andExpect(jsonPath("$.data[0].nickname").exists())
                // 내 자신은 추천 대상에 들어가면 안 됨
                .andExpect(jsonPath("$.data[0].nickname").value(org.hamcrest.Matchers.not("myNickname")))
                // 추천 목록 안에 JavaExpert가 포함되는지 확인
                .andExpect(jsonPath("$.data[*].nickname").value(org.hamcrest.Matchers.hasItem("JavaExpert")))
                .andDo(print());
    }

    @Test
    @DisplayName("로그인 사용자는 자기 자신을 추천받지 않는다")
    void shouldNotRecommendMyself() throws Exception {
        // 내 점수만 올려도 자기 자신은 추천 목록에서 제외되어야 함
        techScoreService.increaseScore(me, javaTech, "POST");

        mvc.perform(get("/api/users/recommendations").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data[*].nickname")
                        .value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("myNickname"))))
                .andDo(print());
    }

    @Test
    @DisplayName("비로그인 사용자는 인기순 fallback 추천을 받는다")
    void getRecommendationsWithNoLogin() throws Exception {
        // 비로그인 상황에서는 followerCount 내림차순 추천 로직을 탄다.
        // followerCount를 쉽게 만들기 위해 사용자만 여러 명 생성한다.
        saveUser("popular1@test.com", "PopularUser1");
        saveUser("popular2@test.com", "PopularUser2");
        saveUser("popular3@test.com", "PopularUser3");

        mvc.perform(get("/api/users/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                // 비로그인일 때도 추천 결과가 내려오는지만 우선 확인
                .andExpect(jsonPath("$.data").isArray())
                .andDo(print());
    }

    /**
     * 회원가입 API를 통해 테스트용 사용자를 생성한다.
     * 실제 인증 흐름을 타므로 컨트롤러 통합 테스트에 가깝다.
     */
    private User saveUser(String email, String nickname) throws Exception {
        SignupRequest request = new SignupRequest(
                nickname,
                email,
                "password123!",
                LocalDate.of(1990, 1, 1),
                Gender.MALE,
                "https://github.com/" + nickname,
                Resume.UNDERGRADUATE);

        mvc.perform(post("/api/auth/signup")
                        .content(objectMapper.writeValueAsString(request))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        return userRepository.findByEmailAndIsDeletedFalse(email).orElseThrow();
    }

    /**
     * 로그인 API 호출 후 accessToken 쿠키를 꺼낸다.
     * 이후 추천 API 호출 시 인증 사용자처럼 테스트할 수 있다.
     */
    private Cookie loginAndGetCookie(String email, String password) throws Exception {
        String loginJson = String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);

        MvcResult result = mvc.perform(
                        post("/api/auth/login").content(loginJson).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        return result.getResponse().getCookie("accessToken");
    }
}
