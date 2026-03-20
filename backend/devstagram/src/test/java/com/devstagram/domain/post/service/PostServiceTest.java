package com.devstagram.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.dto.PostDetailRes;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostLikeRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private PostService postService;

    @Mock
    private PostLikeRepository postLikeRepository;

    @Test
    @DisplayName("[게시글 작성 성공]")
    void createPost_Success() {
        // 1. given
        Long userId = 1L;
        PostCreateReq req = new PostCreateReq("테스트 제목", "테스트 내용");

        User mockUser = mock(User.class);
        ReflectionTestUtils.setField(mockUser, "id", userId);

        given(userRepository.getReferenceById(userId)).willReturn(mockUser);

        Post savedPost = Post.builder()
                .title(req.title())
                .content(req.content())
                .user(mockUser)
                .build();

        ReflectionTestUtils.setField(savedPost, "id", 1L);

        given(postRepository.save(any(Post.class))).willReturn(savedPost);

        // 2. when
        Long postId = postService.createPost(userId, req);

        // 3. then
        assertThat(postId).isEqualTo(1L);
        verify(userRepository).getReferenceById(userId);
        verify(postRepository, times(1)).save(any(Post.class));
    }

    @Test
    @DisplayName("[다건 조회 슬라이싱] 최신순 피드")
    void getPostFeed_Success() {
        // 1. given
        Pageable pageable = PageRequest.of(0, 10);

        // [추가] 작성자 Mock 생성 및 설정
        User writer = mock(User.class);
        given(writer.getNickname()).willReturn("작성자");

        // [수정] Post 생성 시 User 객체 연결
        List<Post> posts = List.of(
                Post.builder().title("제목1").user(writer).build(),
                Post.builder().title("제목2").user(writer).build()
        );

        Slice<Post> slice = new SliceImpl<>(posts, pageable, false);

        given(postRepository.findAllByOrderByCreatedAtDesc(pageable)).willReturn(slice);

        // 2. when
        Slice<PostFeedRes> result = postService.getPostFeed(pageable);

        // 3. then
        assertThat(result.getContent()).hasSize(2);
        // DTO 변환 후 작성자 닉네임이 잘 들어갔는지 확인
        assertThat(result.getContent().get(0).nickname()).isEqualTo("작성자");

        verify(postRepository).findAllByOrderByCreatedAtDesc(pageable);
    }

    @Test
    @DisplayName("[다건 조회 슬라이싱] 최대 10개")
    void getPostFeed_Slicing_Test() {
        // 1. given
        Pageable pageable = PageRequest.of(0, 10);

        User mockUser = mock(User.class);
        given(mockUser.getNickname()).willReturn("테스트작성자");

        List<Post> posts = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            posts.add(Post.builder()
                    .title("제목" + i)
                    .user(mockUser)
                    .build());
        }

        List<Post> firstPageContent = posts.subList(0, 10);
        Slice<Post> slice = new SliceImpl<>(firstPageContent, pageable, true);
        given(postRepository.findAllByOrderByCreatedAtDesc(pageable)).willReturn(slice);

        // 2. when
        Slice<PostFeedRes> result = postService.getPostFeed(pageable);

        // 3. then
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.hasNext()).isTrue();
        assertThat(result.getContent().get(0).nickname()).isEqualTo("테스트작성자");
        assertThat(result.getContent().get(0).title()).isEqualTo("제목1");
        verify(postRepository, times(1)).findAllByOrderByCreatedAtDesc(pageable);
    }

    @Test
    @DisplayName("[게시글 수정 성공]")
    void updatePost_Success() {
        // given
        Long userId = 1L;
        Long postId = 100L;
        PostUpdateReq updateReq = new PostUpdateReq("수정된 제목", "수정된 내용");

        User writer = mock(User.class);
        given(writer.getId()).willReturn(userId);

        Post mockPost = Post.builder()
                .title("기존 제목")
                .content("기존 내용")
                .user(writer)
                .build();

        given(postRepository.findById(postId)).willReturn(Optional.of(mockPost));

        // when
        postService.updatePost(userId, postId, updateReq);

        // then
        assertThat(mockPost.getTitle()).isEqualTo("수정된 제목");
        assertThat(mockPost.getContent()).isEqualTo("수정된 내용");
        verify(postRepository).findById(postId);
    }

    @Test
    @DisplayName("[게시글 삭제 성공]")
    void deletePost_Success() {
        // given
        Long userId = 1L;
        Long postId = 100L;

        User writer = mock(User.class);
        given(writer.getId()).willReturn(userId);

        Post mockPost = Post.builder().user(writer).build();

        ReflectionTestUtils.setField(mockPost, "is_deleted", false);

        given(postRepository.findById(postId)).willReturn(Optional.of(mockPost));

        // when
        postService.deletePost(userId, postId);

        // then
        assertThat(mockPost.is_deleted()).isTrue();
        verify(commentRepository).deleteRepliesByPostId(postId);
        verify(commentRepository).deleteParentsByPostId(postId);
        verify(postRepository).findById(postId);
    }

    @Test
    @DisplayName("[게시글 상세 조회 성공] - 댓글 슬라이싱 포함")
    void getPostDetail_Success() {
        // 1. Given
        Long postId = 1L;
        int pageNumber = 0;

        // 작성자 및 게시글 (ReflectionTestUtils로 ID 주입 필수)
        User writer = mock(User.class);
        given(writer.getNickname()).willReturn("작성자닉네임");

        Post post = Post.builder()
                .title("테스트 제목")
                .content("테스트 내용")
                .user(writer)
                .commentCount(5L)
                .likeCount(10L)
                .build();
        ReflectionTestUtils.setField(post, "id", postId);

        // 댓글 데이터 준비
        User commentWriter = mock(User.class);
        given(commentWriter.getNickname()).willReturn("댓글러1");
        given(commentWriter.getId()).willReturn(10L);

        Comment realComment = Comment.builder()
                .content("첫 번째 댓글")
                .user(commentWriter)
                .post(post)
                .build();
        ReflectionTestUtils.setField(realComment, "id", 1L);
        ReflectionTestUtils.setField(realComment, "createdAt", LocalDateTime.now());
        ReflectionTestUtils.setField(realComment, "modifiedAt", LocalDateTime.now());

        Slice<Comment> commentEntitySlice = new SliceImpl<>(List.of(realComment), PageRequest.of(pageNumber, 10), true);

        given(postRepository.findById(anyLong())).willReturn(Optional.of(post));

        given(commentRepository.findCommentsWithUserAndImageByPostId(anyLong(), any(Pageable.class)))
                .willReturn(commentEntitySlice);

        // 2. When
        PostDetailRes result = postService.getPostDetail(postId, pageNumber);

        // 3. Then
        assertThat(result.nickname()).isEqualTo("작성자닉네임");
        assertThat(result.title()).isEqualTo("테스트 제목");
        assertThat(result.comments()).isNotNull();
        assertThat(result.comments().getContent().get(0).content()).isEqualTo("첫 번째 댓글");

        // 4. Verify
        verify(postRepository).findById(postId);
        verify(commentRepository).findCommentsWithUserAndImageByPostId(eq(postId), any(Pageable.class));
    }
}
