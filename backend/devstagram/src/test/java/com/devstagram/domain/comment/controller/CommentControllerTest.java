package com.devstagram.domain.comment.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.Collections;
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

import com.devstagram.domain.comment.dto.*;
import com.devstagram.domain.comment.service.CommentService;
import com.devstagram.domain.post.service.PostService;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.RateLimitService;
import com.devstagram.global.security.SecurityUser;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;

@WebMvcTest(CommentController.class)
class CommentControllerTest {

    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RateLimitService rateLimitService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PostService postService;

    @MockitoBean
    private CommentService commentService;

    @MockitoBean
    private JwtProvider jwtProvider;

    @MockitoBean
    private UserSecurityService userSecurityService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private Rq rq;

    @BeforeEach
    void setUp() {
        // Rq Header & Cookie Mocking
        given(rq.getHeader(eq("Authorization"), anyString())).willReturn("Bearer dummy");
        given(rq.getCookieValue(anyString(), anyString())).willReturn("");

        // JWT Mocking
        given(jwtProvider.isValid(anyString())).willReturn(true);
        given(jwtProvider.isAccessToken(anyString())).willReturn(true);

        Claims mockClaims = mock(Claims.class);
        given(mockClaims.getSubject()).willReturn("1");
        given(jwtProvider.payload(anyString())).willReturn(mockClaims);

        // Security User Mocking
        User mockUser = mock(User.class);
        SecurityUser mockSecurityUser =
                new SecurityUser(1L, "user@test.com", "테스트닉네임", "api-key-123", "", Collections.emptyList());

        given(userSecurityService.findById(1L)).willReturn(mockUser);
        given(userSecurityService.toSecurityUser(mockUser)).willReturn(mockSecurityUser);
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 조회 성공]")
    void getComments_Success() throws Exception {
        // given
        Long postId = 1L;
        int pageNumber = 0;
        CommentInfoRes comment = new CommentInfoRes(
                1L, 10L, "댓글 내용", "닉네임", true, false, "url", LocalDateTime.now(), LocalDateTime.now(), 0L, 0L);
        Slice<CommentInfoRes> slice = new SliceImpl<>(List.of(comment));

        given(commentService.getCommentsByPostId(any(), eq(postId), eq(pageNumber)))
                .willReturn(slice);
        // when & then
        mockMvc.perform(get("/api/posts/{postId}/comments", postId).param("pageNumber", "0"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("댓글 조회 성공"))
                .andExpect(jsonPath("$.data.content[0].content").value("댓글 내용"));
    }

    @Test
    @WithMockUser
    @DisplayName("[대댓글 조회 성공]")
    void getReplies_Success() throws Exception {
        // given
        Long commentId = 1L;
        ReplyInfoRes reply = new ReplyInfoRes(
                1L, 10L, "대댓글 내용", "닉네임", false, true, "url", LocalDateTime.now(), LocalDateTime.now(), 0L);
        Slice<ReplyInfoRes> slice = new SliceImpl<>(List.of(reply));

        given(commentService.getRepliesByCommentId(any(), eq(commentId), anyInt()))
                .willReturn(slice);

        // when & then
        mockMvc.perform(get("/api/comments/{commentId}/replies", commentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("대댓글 조회 성공"))
                .andExpect(jsonPath("$.data.content[0].content").value("대댓글 내용"));
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 작성 성공] - 201 Created")
    void createComment_Success() throws Exception {
        // given
        Long postId = 1L;
        CommentCreateReq req = new CommentCreateReq("댓글 작성 테스트", null);
        given(commentService.createComment(eq(postId), anyLong(), any(CommentCreateReq.class)))
                .willReturn(100L);

        // when & then
        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/posts/1/comments/100"))
                .andExpect(jsonPath("$.resultCode").value("201-S-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 수정 성공]")
    void updateComment_Success() throws Exception {
        // given
        Long commentId = 1L;
        CommentUpdateReq req = new CommentUpdateReq("수정된 내용");
        doNothing().when(commentService).updateComment(eq(commentId), anyLong(), anyString());

        // when & then
        mockMvc.perform(put("/api/comments/{commentId}", commentId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 삭제 성공]")
    void deleteComment_Success() throws Exception {
        // given
        Long commentId = 1L;
        doNothing().when(commentService).deleteComment(eq(commentId), anyLong());

        // when & then
        mockMvc.perform(delete("/api/comments/{commentId}", commentId).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 좋아요 토글 성공] - 좋아요 생성")
    void toggleCommentLike_Created() throws Exception {
        // given
        Long commentId = 1L;
        CommentLikeRes res = new CommentLikeRes(true, 10L);
        given(commentService.toggleCommentLike(eq(commentId), anyLong())).willReturn(res);

        // when & then
        mockMvc.perform(post("/api/comments/{commentId}", commentId).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("댓글 좋아요 성공"))
                .andExpect(jsonPath("$.data.isLiked").value(true))
                .andExpect(jsonPath("$.data.likeCount").value(10));
    }

    @Test
    @WithMockUser
    @DisplayName("[댓글 좋아요 토글 성공] - 좋아요 취소")
    void toggleCommentLike_Removed() throws Exception {
        // given
        Long commentId = 1L;
        CommentLikeRes res = new CommentLikeRes(false, 9L);
        given(commentService.toggleCommentLike(eq(commentId), anyLong())).willReturn(res);

        // when & then
        mockMvc.perform(post("/api/comments/{commentId}", commentId).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"))
                .andExpect(jsonPath("$.msg").value("댓글 좋아요 취소 성공"))
                .andExpect(jsonPath("$.data.isLiked").value(false))
                .andExpect(jsonPath("$.data.likeCount").value(9));
    }
}
