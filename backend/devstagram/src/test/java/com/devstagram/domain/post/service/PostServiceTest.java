package com.devstagram.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostDetailRes;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostLikeRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.post.repository.PostScrapRepository;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.technology.service.TechScoreService;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.storage.StorageService;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private PostService postService;

    @Mock
    private PostLikeRepository postLikeRepository;

    @Mock
    private PostScrapRepository postScrapRepository;

    @Mock
    private TechnologyRepository technologyRepository;

    @Mock
    private TechScoreService techScoreService;

    @Test
    @DisplayName("[게시글 작성 성공]")
    void createPost_Success() {
        // 1. given
        Long userId = 1L;
        List<Long> techIds = List.of(1L);
        PostCreateReq req = new PostCreateReq("테스트 제목", "테스트 내용", techIds);

        List<org.springframework.web.multipart.MultipartFile> files = new java.util.ArrayList<>();

        User mockUser = mock(User.class);
        ReflectionTestUtils.setField(mockUser, "id", userId);

        given(userRepository.getReferenceById(userId)).willReturn(mockUser);

        Technology mockTech = mock(Technology.class);
        given(technologyRepository.findAllById(techIds)).willReturn(List.of(mockTech));

        Post savedPost = Post.builder()
                .title(req.title())
                .content(req.content())
                .user(mockUser)
                .build();

        ReflectionTestUtils.setField(savedPost, "id", 1L);

        given(postRepository.save(any(Post.class))).willReturn(savedPost);

        // 2. when
        Long postId = postService.createPost(userId, req, files);

        // 3. then
        assertThat(postId).isEqualTo(1L);
        verify(userRepository).getReferenceById(userId);
        verify(postRepository, times(1)).save(any(Post.class));
        verify(techScoreService, times(1)).increaseScore(eq(mockUser), eq(mockTech), eq("POST"));
    }

    @Test
    @DisplayName("[다건 조회 슬라이싱] 최신순 피드")
    void getPostFeed_Success() {
        // 1. given
        Pageable pageable = PageRequest.of(0, 10);

        User writer = mock(User.class);
        given(writer.getNickname()).willReturn("작성자");

        List<Post> posts = List.of(
                Post.builder().title("제목1").user(writer).build(),
                Post.builder().title("제목2").user(writer).build());

        Slice<Post> slice = new SliceImpl<>(posts, pageable, false);

        given(postRepository.findAllByOrderByCreatedAtDesc(pageable)).willReturn(slice);

        // 2. when
        Slice<PostFeedRes> result = postService.getPostFeed(pageable);

        // 3. then
        assertThat(result.getContent()).hasSize(2);
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
            posts.add(Post.builder().title("제목" + i).user(mockUser).build());
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
        List<Long> techIds = List.of(1L);
        PostUpdateReq updateReq = new PostUpdateReq("수정된 제목", "수정된 내용", techIds);
        List<org.springframework.web.multipart.MultipartFile> files = null; // 파일이 없는 경우 테스트

        User writer = mock(User.class);
        given(writer.getId()).willReturn(userId);

        Post mockPost =
                Post.builder().title("기존 제목").content("기존 내용").user(writer).build();

        given(postRepository.findById(postId)).willReturn(Optional.of(mockPost));

        Technology mockTech = mock(Technology.class);
        given(technologyRepository.findAllById(techIds)).willReturn(List.of(mockTech));

        // when
        postService.updatePost(userId, postId, updateReq, files);

        // then
        assertThat(mockPost.getTitle()).isEqualTo("수정된 제목");
        assertThat(mockPost.getContent()).isEqualTo("수정된 내용");
        assertThat(mockPost.getTechTags()).hasSize(1);
        verify(techScoreService).increaseScore(eq(writer), eq(mockTech), eq("POST"));
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

        Post mockPost = Post.builder().user(writer).mediaList(new ArrayList<>()).build();

        ReflectionTestUtils.setField(mockPost, "id", postId);
        ReflectionTestUtils.setField(mockPost, "isDeleted", false);

        given(postRepository.findById(postId)).willReturn(Optional.of(mockPost));

        // when
        postService.deletePost(userId, postId);

        // then
        assertThat(mockPost.isDeleted()).isTrue();
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

        User writer = mock(User.class);
        given(writer.getNickname()).willReturn("작성자닉네임");

        Post post = Post.builder()
                .title("테스트 제목")
                .content("테스트 내용")
                .user(writer)
                .commentCount(5L)
                .likeCount(10L)
                .mediaList(new ArrayList<>())
                .build();
        ReflectionTestUtils.setField(post, "id", postId);

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

        given(postRepository.findPostWithDetails(postId)).willReturn(Optional.of(post));
        given(commentRepository.findCommentsWithUserAndImageByPostId(eq(postId), any(Pageable.class)))
                .willReturn(commentEntitySlice);

        // 2. When
        PostDetailRes result = postService.getPostDetail(postId, pageNumber);

        // 3. Then
        assertThat(result.nickname()).isEqualTo("작성자닉네임");
        assertThat(result.title()).isEqualTo("테스트 제목");
        assertThat(result.comments()).isNotNull();
        assertThat(result.comments().getContent().get(0).content()).isEqualTo("첫 번째 댓글");

        // 4. Verify
        verify(postRepository).findPostWithDetails(postId); // findById -> findPostWithDetails
        verify(commentRepository).findCommentsWithUserAndImageByPostId(eq(postId), any(Pageable.class));
    }

    @Test
    @DisplayName("[스크랩 조회 성공] - 사용자가 스크랩한 게시글 목록을 Post 객체로 반환")
    void getUserScrappedPosts_Success() {
        // 1. given
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());

        User writer = mock(User.class);
        given(writer.getNickname()).willReturn("원작자");

        Post scrappedPost1 = Post.builder().title("스크랩한 글 1").user(writer).build();
        Post scrappedPost2 = Post.builder().title("스크랩한 글 2").user(writer).build();
        ReflectionTestUtils.setField(scrappedPost1, "id", 101L);
        ReflectionTestUtils.setField(scrappedPost2, "id", 102L);

        List<Post> scrappedPosts = List.of(scrappedPost1, scrappedPost2);
        Page<Post> postPage = new PageImpl<>(scrappedPosts, pageable, scrappedPosts.size());

        given(postScrapRepository.findActivePostsByUserId(eq(userId), any(Pageable.class)))
                .willReturn(postPage);

        // 2. when
        Page<PostFeedRes> result = postService.getUserScrappedPosts(userId, pageable);

        // 3. then
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).title()).isEqualTo("스크랩한 글 1");
        assertThat(result.getContent().get(0).nickname()).isEqualTo("원작자");

        verify(postScrapRepository).findActivePostsByUserId(userId, pageable);
    }
}
