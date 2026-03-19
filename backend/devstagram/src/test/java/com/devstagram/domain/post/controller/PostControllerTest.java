package com.devstagram.domain.post.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostDetailRes;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.service.PostService;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.SecurityUser;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;

@WebMvcTest(PostController.class)
class PostControllerTest {

    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtProvider jwtProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PostService postService;

    @MockitoBean
    private UserSecurityService userSecurityService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private Rq rq;

    @BeforeEach
    void setUp() {

        given(rq.getHeader(eq("Authorization"), anyString())).willReturn("Bearer dummy");
        given(rq.getHeader(eq("X-API-KEY"), anyString())).willReturn("");
        given(rq.getCookieValue(anyString(), anyString())).willReturn("");

        // jwt
        given(jwtProvider.isValid(anyString())).willReturn(true);
        Claims mockClaims = mock(Claims.class);
        given(mockClaims.getSubject()).willReturn("1");
        given(jwtProvider.payload(anyString())).willReturn(mockClaims);

        // user
        User mockUser = mock(User.class);
        SecurityUser mockSecurityUser = mock(SecurityUser.class); // 가짜 SecurityUser 생성

        given(userSecurityService.findById(1L)).willReturn(mockUser);
        given(userSecurityService.toSecurityUser(mockUser)).willReturn(mockSecurityUser);

        given(mockSecurityUser.getPassword()).willReturn("");
        given(mockSecurityUser.getAuthorities()).willReturn(java.util.Collections.emptyList());
    }

    @Test
    @WithMockUser
    @DisplayName("[게시글 생성 성공] - 201")
    void createPost_Success() throws Exception {
        // given
        PostCreateReq req = new PostCreateReq("새 제목", "새 내용");
        given(postService.createPost(any(), any(PostCreateReq.class))).willReturn(1L);

        // when & then
        mockMvc.perform(post("/api/posts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/posts/1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[게시글 수정 성공] - 200")
    void updatePost_Success() throws Exception {
        // given
        Long postId = 1L;
        PostUpdateReq updateReq = new PostUpdateReq("수정된 제목", "수정된 내용");

        doNothing().when(postService).updatePost(eq(1L), eq(postId), any(PostUpdateReq.class));

        // when & then
        mockMvc.perform(put("/api/posts/{postId}", postId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").exists());
    }

    @Test
    @WithMockUser
    @DisplayName("[게시물 삭제 성공] - 200")
    void deletePost_Success() throws Exception {
        // given
        Long postId = 1L;
        doNothing().when(postService).deletePost(eq(1L), eq(postId));

        // when & then
        mockMvc.perform(delete("/api/posts/{postId}", postId).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[게시물 상세 조회 성공]")
    void getPostDetail_Success() throws Exception {
        // given
        Long postId = 1L;
        LocalDateTime now = LocalDateTime.now();

        PostDetailRes response = PostDetailRes.builder()
                .id(postId)
                .title("테스트 제목")
                .content("테스트 내용")
                .likeCount(10L)
                .commentCount(5L)
                .createdAt(now)
                .build();

        given(postService.getPostDetail(postId)).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/posts/{postId}", postId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("게시물 조회 성공"))
                .andExpect(jsonPath("$.data.id").value(postId))
                .andExpect(jsonPath("$.data.title").value("테스트 제목"))
                .andExpect(jsonPath("$.data.likeCount").value(10))
                .andExpect(jsonPath("$.data.commentCount").value(5))
                .andExpect(jsonPath("$.data.createdAt").exists());
    }

    @Test
    @WithMockUser
    @DisplayName("[게시물 피드 조회 성공]")
    void getPostFeed_Success() throws Exception {
        // given
        LocalDateTime now = LocalDateTime.now();

        List<PostFeedRes> content = List.of(
                PostFeedRes.builder()
                        .id(1L)
                        .title("제목1")
                        .content("내용1")
                        .likeCount(10L)
                        .commentCount(2L)
                        .createdAt(now)
                        .build(),
                PostFeedRes.builder()
                        .id(2L)
                        .title("제목2")
                        .content("내용2")
                        .likeCount(5L)
                        .commentCount(0L)
                        .createdAt(now)
                        .build());

        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Slice<PostFeedRes> sliceResponse = new SliceImpl<>(content, pageable, false);

        given(postService.getPostFeed(any(Pageable.class))).willReturn(sliceResponse);

        // when & then
        mockMvc.perform(get("/api/posts").param("page", "0").param("size", "10").param("sort", "createdAt,desc"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("피드 조회 성공"))
                .andExpect(jsonPath("$.data.content[0].id").value(1L))
                .andExpect(jsonPath("$.data.content[0].title").value("제목1"))
                .andExpect(jsonPath("$.data.content[1].id").value(2L))
                .andExpect(jsonPath("$.data.content[1].likeCount").value(5))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.first").value(true));
    }
}
