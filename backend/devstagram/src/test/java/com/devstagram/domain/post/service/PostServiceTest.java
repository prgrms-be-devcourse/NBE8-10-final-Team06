package com.devstagram.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PostService postService;

    @Test
    @DisplayName("[게시글 작성 성공]")
    void createPost_Success() {
        // given
        PostCreateReq req = new PostCreateReq("테스트 제목", "테스트 내용");

        Post savedPost =
                Post.builder().title(req.title()).content(req.content()).build();

        ReflectionTestUtils.setField(savedPost, "id", 1L);

        given(postRepository.save(any(Post.class))).willReturn(savedPost);

        // when
        Long postId = postService.createPost(req);

        // then
        assertThat(postId).isEqualTo(1L);
        verify(postRepository, times(1)).save(any(Post.class));
    }

    @Test
    @DisplayName("[다건 조회 슬라이싱] 최신순 피드")
    void getPostFeed_Success() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        List<Post> posts = List.of(
                Post.builder().title("제목1").build(), Post.builder().title("제목2").build());
        Slice<Post> slice = new SliceImpl<>(posts, pageable, false);

        given(postRepository.findAllByOrderByCreatedAtDescIdDesc(pageable)).willReturn(slice);

        // when
        Slice<PostFeedRes> result = postService.getPostFeed(pageable);

        // then
        assertThat(result.getContent()).hasSize(2);
        verify(postRepository).findAllByOrderByCreatedAtDescIdDesc(pageable);
    }

    @Test
    @DisplayName("[다건 조회 슬라이싱] 최대 10개")
    void getPostFeed_Slicing_Test() {
        // given
        Pageable pageable = PageRequest.of(0, 10);

        List<Post> posts = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            posts.add(Post.builder().title("제목" + i).build());
        }

        List<Post> firstPageContent = posts.subList(0, 10);
        Slice<Post> slice = new SliceImpl<>(firstPageContent, pageable, true);
        given(postRepository.findAllByOrderByCreatedAtDescIdDesc(pageable)).willReturn(slice);

        // when
        Slice<PostFeedRes> result = postService.getPostFeed(pageable);

        // then
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.hasNext()).isTrue();
        assertThat(result.getContent().get(0).title()).isEqualTo("제목1");

        verify(postRepository, times(1)).findAllByOrderByCreatedAtDescIdDesc(pageable);
    }

    @Test
    @DisplayName("[게시글 수정 성공]")
    void updatePost_Success() {
        // given
        Long postId = 1L;
        PostUpdateReq updateReq = new PostUpdateReq("수정된 제목", "수정된 내용");

        Post mockPost = Post.builder().title("기존 제목").content("기존 내용").build();

        given(postRepository.findById(postId)).willReturn(Optional.of(mockPost));

        // when
        postService.updatePost(postId, updateReq);

        // then
        assertThat(mockPost.getTitle()).isEqualTo("수정된 제목");
        assertThat(mockPost.getContent()).isEqualTo("수정된 내용");
        verify(postRepository, times(1)).findById(postId);
    }

    @Test
    @DisplayName("[게시글 삭제 성공]")
    void deletePost_Success() {
        Long postId = 1L;

        given(postRepository.existsById(postId)).willReturn(true);

        postService.deletePost(postId);

        // then
        verify(postRepository, times(1)).deleteById(postId);
    }
}
