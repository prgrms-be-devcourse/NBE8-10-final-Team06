package com.devstagram.domain.user.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.user.dto.ProfileUpdateRequest;
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
class UserControllerTest {

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

    private Cookie authCookie;
    private User me;
    private User otherUser;

    @BeforeEach
    void init() throws Exception {
        // 테스트용 사용자 초기화
        userRepository.deleteAll();

        // 로그인 유저 생성
        me = saveUser("me@test.com", "myNickname");
        authCookie = loginAndGetCookie("me@test.com", "password123!");

        // 프로필 조회/검색 대상 유저 생성
        otherUser = saveUser("other@test.com", "otherNickname");
    }

    @Test
    @DisplayName("특정 사용자의 프로필 조회 성공")
    void getProfileSuccess() throws Exception {
        // otherNickname 프로필 조회
        mvc.perform(get("/api/users/" + otherUser.getNickname() + "/profile").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("프로필 조회 성공"))
                .andExpect(jsonPath("$.data.nickname").value("otherNickname"))
                .andExpect(jsonPath("$.data.profileImageUrl").exists())
                .andDo(print());
    }

    @Test
    @DisplayName("프로필 조회 시 기술 벡터 기반 상위 기술 점수를 반환한다")
    void getProfileTopTechScoresFromVector() throws Exception {
        // given
        TechCategory backendCategory = techCategoryRepository.save(
                TechCategory.builder().name("Backend").color("#6C757D").build());

        Technology javaTechnology = technologyRepository.save(Technology.builder()
                .name("Java")
                .color("#007396")
                .category(backendCategory)
                .build());

        Technology springBootTechnology = technologyRepository.save(Technology.builder()
                .name("Spring Boot")
                .color("#6DB33F")
                .category(backendCategory)
                .build());

        Technology dockerTechnology = technologyRepository.save(Technology.builder()
                .name("Docker")
                .color("#2496ED")
                .category(backendCategory)
                .build());

        // 저장된 실제 기술 ID를 사용해 벡터 점수를 누적한다.
        otherUser.updateTechScore(javaTechnology.getId().intValue(), 65);
        otherUser.updateTechScore(springBootTechnology.getId().intValue(), 40);
        otherUser.updateTechScore(dockerTechnology.getId().intValue(), 20);

        userRepository.save(otherUser);

        // when & then
        mvc.perform(get("/api/users/" + otherUser.getNickname() + "/profile").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("프로필 조회 성공"))
                .andExpect(jsonPath("$.data.nickname").value("otherNickname"))
                .andExpect(jsonPath("$.data.topTechScores").isArray())
                .andExpect(jsonPath("$.data.topTechScores[0].techName").value("Java"))
                .andExpect(jsonPath("$.data.topTechScores[0].score").value(65))
                .andExpect(jsonPath("$.data.topTechScores[1].techName").value("Spring Boot"))
                .andExpect(jsonPath("$.data.topTechScores[1].score").value(40))
                .andExpect(jsonPath("$.data.topTechScores[2].techName").value("Docker"))
                .andExpect(jsonPath("$.data.topTechScores[2].score").value(20))
                .andDo(print());
    }

    @Test
    @DisplayName("유저 검색 성공")
    void searchUsersSuccess() throws Exception {
        // keyword = other 로 검색
        mvc.perform(get("/api/users/search").param("keyword", "other").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("유저 검색 성공"))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[0].nickname").value("otherNickname"))
                .andDo(print());
    }

    @Test
    @DisplayName("내 프로필 수정 성공")
    void updateProfileSuccess() throws Exception {
        // multipart/form-data 요청에서 request 파트는 JSON으로 전달
        ProfileUpdateRequest request = new ProfileUpdateRequest(
                "updatedNickname",
                "https://github.com/updatedNickname",
                Resume.JUNIOR,
                LocalDate.of(1995, 5, 5),
                Gender.FEMALE);

        MockMultipartFile requestPart = new MockMultipartFile(
                "request", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(request));

        // PUT multipart 요청
        mvc.perform(multipart("/api/users/me/profile")
                        .file(requestPart)
                        .cookie(authCookie)
                        .with(req -> {
                            req.setMethod("PUT");
                            return req;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("프로필이 수정되었습니다."))
                .andDo(print());

        // 실제 DB 반영 확인
        User updatedUser =
                userRepository.findByEmailAndIsDeletedFalse("me@test.com").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(updatedUser.getNickname()).isEqualTo("updatedNickname");
        org.assertj.core.api.Assertions.assertThat(updatedUser.getGender()).isEqualTo(Gender.FEMALE);
        org.assertj.core.api.Assertions.assertThat(updatedUser.getBirthDate()).isEqualTo(LocalDate.of(1995, 5, 5));
    }

    @Test
    @DisplayName("회원 탈퇴 성공")
    void withdrawSuccess() throws Exception {
        mvc.perform(delete("/api/users/me").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("회원 탈퇴가 완료되었습니다."))
                .andDo(print());

        User withdrawnUser = userRepository.findById(me.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(withdrawnUser.isDeleted()).isTrue();
    }

    /**
     * 회원가입 API를 통해 테스트용 유저를 생성한다.
     * 실제 컨트롤러/서비스 흐름을 타므로 통합 테스트에 가깝다.
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
     * 로그인 후 accessToken 쿠키를 반환한다.
     * 이후 인증이 필요한 API 요청에 이 쿠키를 사용한다.
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
