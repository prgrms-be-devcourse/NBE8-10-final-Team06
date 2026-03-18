package com.devstagram.domain.story.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.io.IOException;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.devstagram.domain.story.dto.StoryCreateRequest;
import com.devstagram.domain.story.dto.StoryCreateResponse;
import com.devstagram.domain.story.dto.StoryDetailResponse;
import com.devstagram.domain.story.dto.StoryLikeResponse;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.enumtype.MediaType;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.security.CustomAuthenticationFilter;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.SecurityUser;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebMvcTest(StoryController.class)
@MockitoBean(types = JpaMetamodelMappingContext.class)
class StoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StoryService storyService;

    @MockitoBean
    private CustomAuthenticationFilter customAuthenticationFilter;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserSecurityService userSecurityService;

    @MockitoBean
    private Rq rq;

    private SecurityUser mockSecurityUser;

    @BeforeEach
    void setUp() throws ServletException, IOException {
        mockSecurityUser = new SecurityUser(
                1L,
                "test@test.com",
                "테스터",
                "api-key-123",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));

        doAnswer(invocation -> {
                    HttpServletRequest request = invocation.getArgument(0);
                    HttpServletResponse response = invocation.getArgument(1);
                    FilterChain filterChain = invocation.getArgument(2);
                    filterChain.doFilter(request, response);
                    return null;
                })
                .when(customAuthenticationFilter)
                .doFilter(any(), any(), any());

        given(rq.getHeader(anyString(), anyString())).willReturn("");
        given(rq.getCookieValue(anyString(), anyString())).willReturn("");
    }

    @Test
    @DisplayName("스토리 생성 성공")
    void createStory_Success() throws Exception {
        StoryCreateRequest request = new StoryCreateRequest("테스트 스토리", List.of(2L), MediaType.jpg, "url", "thumb");
        StoryCreateResponse response = StoryCreateResponse.builder()
                .storyId(10L)
                .userId(1L)
                .content("테스트 스토리")
                .tagedUserIds(List.of(2L))
                .build();

        given(storyService.createStory(eq(1L), any(StoryCreateRequest.class))).willReturn(response);

        mockMvc.perform(post("/api/story")
                        .with(csrf())
                        .with(user(mockSecurityUser)) // SecurityUtil.getCurrentUserId()가 1L을 반환하게 함
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data.storyId").value(10L));
    }

    @Test
    @DisplayName("특정 유저 스토리 목록 조회 성공")
    void getAllUserStories_Success() throws Exception {
        Long targetUserId = 2L;
        StoryDetailResponse detailResponse = StoryDetailResponse.builder()
                .storyId(10L)
                .content("목록 테스트")
                .totalLikeCount(5L)
                .isLiked(false)
                .build();

        given(storyService.getUserAllStories(eq(targetUserId), eq(1L))).willReturn(List.of(detailResponse));

        mockMvc.perform(get("/api/story/user/{targetUserId}", targetUserId).with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"));
    }

    @Test
    @DisplayName("좋아요 업데이트 성공(좋아요)")
    void patchStoryLike_Success() throws Exception {
        Long storyId = 10L;
        StoryLikeResponse response = new StoryLikeResponse(storyId, 5L, true);

        given(storyService.patchStoryLike(eq(storyId), eq(1L))).willReturn(response);

        mockMvc.perform(post("/api/story/{storyId}/like", storyId).with(csrf()).with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스토리에 좋아요"));
    }

    @Test
    @DisplayName("스토리 소프트 딜리트 성공")
    void softDeleteStory_Success() throws Exception {
        Long storyId = 10L;

        mockMvc.perform(patch("/api/story/{storyId}/soft-delete", storyId)
                        .with(csrf())
                        .with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스토리가 소프트 딜리트 성공"));

        verify(storyService).softDeleteStory(eq(storyId), eq(1L));
    }

    @Test
    @DisplayName("스토리 하드 딜리트 성공")
    void hardDeleteStory_Success() throws Exception {
        Long storyId = 10L;

        mockMvc.perform(delete("/api/story/{storyId}/hard-delete", storyId)
                        .with(csrf())
                        .with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스토리 하드 딜리트 성공"));

        verify(storyService).hardDeleteStory(eq(storyId), eq(1L));
    }
}
