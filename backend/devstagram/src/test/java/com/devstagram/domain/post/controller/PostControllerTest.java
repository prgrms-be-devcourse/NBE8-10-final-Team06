package com.devstagram.domain.post.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostDetailRes;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.service.PostService;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.service.UserSecurityService;
import com.devstagram.global.rq.Rq;
import com.devstagram.global.security.JwtProvider;
import com.devstagram.global.security.RateLimitService;
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
    private RateLimitService rateLimitService;

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
        given(rq.getCookieValue(eq("accessToken"), anyString())).willReturn("dummy-access-token");

        // rate limit
        given(rateLimitService.isAllowed(anyString(), anyLong(), any())).willReturn(true);

        // jwt
        given(jwtProvider.isValid(anyString())).willReturn(true);
        given(jwtProvider.isAccessToken(anyString())).willReturn(true);

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
        List<Long> expectedTechIds = List.of(1L, 2L);
        PostCreateReq req = new PostCreateReq("새 제목", "새 내용", expectedTechIds);
        String requestJson = objectMapper.writeValueAsString(req);

        MockMultipartFile requestPart =
                new MockMultipartFile("request", "", "application/json", requestJson.getBytes(StandardCharsets.UTF_8));
        MockMultipartFile filePart =
                new MockMultipartFile("files", "test.jpg", "image/jpeg", "test image content".getBytes());

        given(postService.createPost(
                        anyLong(), argThat(request -> request.techIds().equals(expectedTechIds)), anyList()))
                .willReturn(1L);

        // when & then
        mockMvc.perform(multipart("/api/posts")
                        .file(requestPart)
                        .file(filePart)
                        .with(csrf())
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/posts/1"));
    }

    @Test
    @WithMockUser
    @DisplayName("[게시글 수정 성공] - 200")
    void updatePost_Success() throws Exception {
        // given
        Long postId = 1L;
        List<Long> expectedTechIds = List.of(1L, 2L);
        PostUpdateReq updateReq = new PostUpdateReq("수정된 제목", "수정된 내용", expectedTechIds);
        String updateJson = objectMapper.writeValueAsString(updateReq);

        MockMultipartFile requestPart =
                new MockMultipartFile("request", "", "application/json", updateJson.getBytes(StandardCharsets.UTF_8));

        doNothing()
                .when(postService)
                .updatePost(
                        anyLong(),
                        eq(postId),
                        argThat(req -> req.techIds().equals(expectedTechIds)), // 리스트 일치 확인
                        any());
        // when & then
        mockMvc.perform(multipart(HttpMethod.PUT, "/api/posts/{postId}", postId)
                        .file(requestPart)
                        .with(csrf())
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200-S-1"));

        verify(postService)
                .updatePost(anyLong(), eq(postId), argThat(req -> req.techIds().equals(List.of(1L, 2L))), any());
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
        int pageNumber = 0;
        LocalDateTime now = LocalDateTime.now();

        CommentInfoRes comment1 =
                new CommentInfoRes(1L, 10L, "첫 번째 댓글입니다.", "테스트유저", true, false, "url", now, now, 2L, 0);
        List<CommentInfoRes> commentList = List.of(comment1);

        Slice<CommentInfoRes> commentSlice = new SliceImpl<>(commentList, PageRequest.of(pageNumber, 10), true);

        PostDetailRes response = PostDetailRes.builder()
                .id(postId)
                .authorId(10L)
                .nickname("게시글 유저")
                .title("테스트 제목")
                .content("테스트 내용")
                .likeCount(10L)
                .commentCount(5L)
                .isLiked(false) // 추가
                .isScrapped(false)
                .isMine(false) // 추가
                .createdAt(now)
                .comments(commentSlice)
                .build();

        given(postService.getPostDetail(any(), eq(postId), eq(pageNumber))).willReturn(response);
        // when & then
        mockMvc.perform(get("/api/posts/{postId}", postId).param("page", String.valueOf(pageNumber)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("게시물 조회 성공"))
                .andExpect(jsonPath("$.data.nickname").value("게시글 유저"))
                .andExpect(jsonPath("$.data.title").value("테스트 제목"))
                .andExpect(jsonPath("$.data.content").value("테스트 내용"))
                .andExpect(jsonPath("$.data.likeCount").value(10))
                .andExpect(jsonPath("$.data.commentCount").value(5))
                .andExpect(jsonPath("$.data.comments.content[0].id").value(1L))
                .andExpect(jsonPath("$.data.isLiked").value(false))
                .andExpect(jsonPath("$.data.isMine").value(false))
                .andExpect(jsonPath("$.data.comments.content[0].content").value("첫 번째 댓글입니다."))
                .andExpect(jsonPath("$.data.comments.content[0].nickname").value("테스트유저"))
                .andExpect(jsonPath("$.data.comments.content[0].replyCount").value(2))
                .andExpect(jsonPath("$.data.comments.first").value(true))
                .andExpect(jsonPath("$.data.comments.last").value(false))
                .andExpect(jsonPath("$.data.comments.numberOfElements").value(1))
                .andExpect(jsonPath("$.data.id").value(postId))
                .andExpect(jsonPath("$.data.authorId").value(10L));
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
                        .authorId(10L)
                        .nickname("게시글 작성자1")
                        .title("제목1")
                        .content("내용1")
                        .likeCount(10L)
                        .commentCount(2L)
                        .isLiked(true)
                        .isScrapped(false)
                        .isMine(false)
                        .createdAt(now)
                        .build(),
                PostFeedRes.builder()
                        .id(2L)
                        .authorId(10L)
                        .nickname("게시글 작성자2")
                        .title("제목2")
                        .content("내용2")
                        .likeCount(5L)
                        .commentCount(0L)
                        .isLiked(true)
                        .isScrapped(false)
                        .isMine(false)
                        .createdAt(now)
                        .build());

        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Slice<PostFeedRes> sliceResponse = new SliceImpl<>(content, pageable, false);

        given(postService.getPostFeed(any(), any(Pageable.class))).willReturn(sliceResponse);
        // when & then
        mockMvc.perform(get("/api/posts").param("page", "0").param("size", "10").param("sort", "createdAt,desc"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("피드 조회 성공"))
                .andExpect(jsonPath("$.data.content[0].nickname").value("게시글 작성자1"))
                .andExpect(jsonPath("$.data.content[0].id").value(1L))
                .andExpect(jsonPath("$.data.content[0].title").value("제목1"))
                .andExpect(jsonPath("$.data.content[1].nickname").value("게시글 작성자2"))
                .andExpect(jsonPath("$.data.content[1].id").value(2L))
                .andExpect(jsonPath("$.data.content[1].likeCount").value(5))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.numberOfElements").value(2));
    }

    @Test
    @WithMockUser
    @DisplayName("[좋아요 토글 성공]")
    void toggleLike_Success() throws Exception {
        // given
        Long postId = 1L;
        given(postService.togglePostLike(eq(postId), anyLong())).willReturn(true);

        // when & then
        mockMvc.perform(post("/api/posts/{postId}/like", postId).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("좋아요 성공"));
    }

    @Test
    @WithMockUser
    @DisplayName("[스크랩 토글 성공]")
    void toggleScrap_Success() throws Exception {
        // given
        Long postId = 1L;
        given(postService.toggleScrap(eq(postId), anyLong())).willReturn(true);

        // when & then
        mockMvc.perform(post("/api/posts/{postId}/scrap", postId).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스크랩 성공"));
    }

    @Test
    @WithMockUser
    @DisplayName("[스크랩 목록 조회 성공]")
    void getScrappedPosts_Success() throws Exception {
        // 1. given
        LocalDateTime now = LocalDateTime.now();
        List<PostFeedRes> scrapContent = List.of(PostFeedRes.builder()
                .id(100L)
                .nickname("원작자")
                .title("스크랩한 게시글 제목")
                .content("스크랩한 내용...")
                .likeCount(5L)
                .commentCount(2L)
                .createdAt(now)
                .build());

        Pageable pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());
        Page<PostFeedRes> pageResponse = new PageImpl<>(scrapContent, pageable, 1);

        given(postService.getUserScrappedPosts(anyLong(), any(Pageable.class))).willReturn(pageResponse);

        // 2. when & then
        mockMvc.perform(get("/api/posts/scraps").param("page", "0").param("size", "10"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("스크랩 게시글 조회 성공"))
                .andExpect(jsonPath("$.data.content[0].id").value(100L))
                .andExpect(jsonPath("$.data.content[0].title").value("스크랩한 게시글 제목"))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.last").value(true));
    }
}
