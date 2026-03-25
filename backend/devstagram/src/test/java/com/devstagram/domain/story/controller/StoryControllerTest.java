package com.devstagram.domain.story.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.entity.StoryFeedResponse;
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
    @DisplayName("스토리 생성 성공 - 이미지")
    void createStory_Success_Image() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.jpg",
                org.springframework.http.MediaType.IMAGE_JPEG_VALUE,
                "test image content".getBytes());

        StoryCreateResponse response = StoryCreateResponse.builder()
                .storyId(10L)
                .userId(1L)
                .content("테스트 스토리")
                .taggedUserIds(List.of(2L))
                .build();

        given(storyService.createStory(eq(1L), any(StoryCreateRequest.class))).willReturn(response);

        mockMvc.perform(multipart("/api/story")
                        .file(file)
                        .param("content", "테스트 스토리")
                        .param("tagUserIds", "2")
                        .param("mediaType", "jpg")
                        .param("thumbnailUrl", "thumb")
                        .with(csrf())
                        .with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("스토리 생성 성공"))
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
                .mediaUrl("/uploads/test.jpg")
                .mediaType(MediaType.jpg)
                .build();

        given(storyService.getUserAllStories(eq(targetUserId), eq(1L))).willReturn(List.of(detailResponse));

        mockMvc.perform(get("/api/story/user/{targetUserId}", targetUserId).with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data[0].mediaUrl").value("/uploads/test.jpg"));
    }

    @Test
    @DisplayName("좋아요 업데이트 성공(좋아요)")
    void patchStoryLike_Success_Like() throws Exception {
        Long storyId = 10L;
        StoryViewResponse response = StoryViewResponse.builder()
                .storyId(storyId)
                .userId(1L)
                .totalLikeCount(5L)
                .isLiked(true)
                .likedAt(LocalDateTime.now())
                .build();

        given(storyService.patchStoryLike(eq(storyId), eq(1L))).willReturn(response);

        mockMvc.perform(post("/api/story/{storyId}/like", storyId).with(csrf()).with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스토리에 좋아요"))
                .andExpect(jsonPath("$.data.isLiked").value(true));
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

    @Test
    @DisplayName("스토리 시청 기록 성공")
    void recordStoryView_Success() throws Exception {
        Long storyId = 10L;
        StoryDetailResponse detailResponse = StoryDetailResponse.builder()
                .storyId(storyId)
                .content("시청 기록 테스트")
                .totalLikeCount(5L)
                .isLiked(false)
                .build();

        given(storyService.recordSingleStoryView(eq(storyId), eq(1L))).willReturn(detailResponse);

        mockMvc.perform(post("/api/story/{storyId}/view", storyId).with(csrf()).with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("스토리 시청 기록 성공"));
    }

    @Test
    @DisplayName("스토리 홈 피드 조회 성공")
    void getStoryFeed_Success() throws Exception {
        StoryFeedResponse feedResponse = StoryFeedResponse.builder()
                .userId(2L)
                .nickname("followingUser")
                .isUnread(true)
                .lastUpdatedAt(LocalDateTime.now())
                .totalStoryCount(3)
                .build();

        given(storyService.getFollowingStoriesFeed(eq(1L))).willReturn(List.of(feedResponse));

        mockMvc.perform(get("/api/story/feed").with(user(mockSecurityUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.data[0].nickname").value("followingUser"))
                .andExpect(jsonPath("$.data[0].totalStoryCount").value(3));
    }
}
