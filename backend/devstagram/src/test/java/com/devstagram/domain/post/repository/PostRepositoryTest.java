package com.devstagram.domain.post.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;

import com.devstagram.domain.post.entity.Post;

@DataJpaTest
class PostRepositoryTest {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("[게시글 생성]")
    void savePostTest() {

        User author = User.builder()
                .email("test@devstagram.com")
                .nickname("테스터")
                .password("password123!")
                .gender(Gender.MALE)
                .birthDate(LocalDate.of(2000, 1, 1))
                .build();
        userRepository.save(author);

        Post post = Post.builder()
                .title("테스트 제목")
                .content("테스트 내용")
                .user(author) // <--- 작성자 정보 필수!
                .build();

        // 3. when
        Post savedPost = postRepository.save(post);

        // 4. then
        assertThat(savedPost.getId()).isNotNull();
        assertThat(savedPost.getTitle()).isEqualTo("테스트 제목");
        assertThat(savedPost.getLikeCount()).isEqualTo(0L); // @Builder.Default 적용 확인
        assertThat(savedPost.getCreatedAt()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    @Test
    @DisplayName("[게시글 피드 조회]")
    void findAllByOrderByCreatedAtDescTest() {
        // given
        postRepository.save(Post.builder().title("제목1").content("내용1").build());
        postRepository.save(Post.builder().title("제목2").content("내용2").build());
        postRepository.save(Post.builder().title("제목3").content("내용3").build());

        PageRequest pageRequest = PageRequest.of(0, 2);

        // when
        Slice<Post> result = postRepository.findAllByOrderByCreatedAtDescIdDesc(pageRequest);

        // then
        List<Post> content = result.getContent();
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.hasNext()).isTrue();
        assertThat(content.get(0).getTitle()).isEqualTo("제목3");
        assertThat(content.get(1).getTitle()).isEqualTo("제목2");
    }

    @Test
    @DisplayName("[게시글 상세 조회]")
    void findPostTest() {
        // given
        Post post = Post.builder().title("조회 테스트").content("내용").build();
        Post savedPost = postRepository.save(post);

        // when
        Post foundPost = postRepository
                .findById(savedPost.getId())
                .orElseThrow(() -> new IllegalArgumentException("게시글이 없습니다."));

        // then
        assertThat(foundPost.getTitle()).isEqualTo("조회 테스트");
        assertThat(foundPost.getContent()).isEqualTo("내용");
    }

    @Test
    @DisplayName("[게시글 수정]")
    void updatePostTest() {
        // given
        Post post = Post.builder().title("원래 제목").content("원래 내용").build();
        Post savedPost = postRepository.save(post);

        // when
        savedPost.update("수정된 제목", "수정된 내용");

        postRepository.flush();

        // then
        Post updatedPost = postRepository.findById(savedPost.getId()).get();
        assertThat(updatedPost.getTitle()).isEqualTo("수정된 제목");
        assertThat(updatedPost.getContent()).isEqualTo("수정된 내용");
    }

    @Test
    @DisplayName("[게시글 삭제]")
    void deletePostTest() {
        // given
        Post post = Post.builder().title("삭제할 글").content("내용").build();
        Post savedPost = postRepository.save(post);

        // when
        postRepository.delete(savedPost);
        postRepository.flush();

        // then
        boolean exists = postRepository.existsById(savedPost.getId());
        assertThat(exists).isFalse();
    }
}
