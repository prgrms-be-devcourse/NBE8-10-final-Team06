package com.devstagram.domain.comment.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.test.context.ActiveProfiles;

import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.User;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CommentRepositoryTest {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private TestEntityManager em;

    private User createTestUser(String email, String nickname) {
        return User.builder()
                .email(email)
                .nickname(nickname)
                .password("password123!")
                .birthDate(LocalDate.of(1998, 3, 18))
                .gender(Gender.MALE)
                .build();
    }

    private Post createTestPost(String title, String content) {
        return Post.builder().title(title).content(content).build();
    }

    @Test
    @DisplayName("[댓글 조회]")
    void findCommentsWithMemberAndImageByPostId_Success() {
        // given
        User user = createTestUser("user1@test.com", "user1");
        em.persist(user);

        Post post = Post.builder().title("테스트 제목").content("테스트 내용").user(user).build();
        em.persist(post);

        Comment comment1 =
                Comment.builder().content("댓글1").post(post).user(user).build();
        Comment comment2 =
                Comment.builder().content("댓글2").post(post).user(user).build();
        em.persist(comment1);
        em.persist(comment2);

        em.flush();
        em.clear();

        Slice<Comment> result = commentRepository.findCommentsWithUserByPostId(post.getId(), PageRequest.of(0, 10));

        // then (createdAt이 동일 시각이면 desc 정렬 순서가 비결정적일 수 있음)
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).extracting(Comment::getContent).containsExactlyInAnyOrder("댓글1", "댓글2");
    }

    @Test
    @DisplayName("[대댓글 개수]")
    void replyCount_Formula_Success() {
        // given
        User user = createTestUser("user2@test.com", "user2");
        em.persist(user);

        Post post = Post.builder().title("테스트 제목").content("테스트 내용").user(user).build();
        em.persist(post);

        Comment parent = Comment.builder().content("부모").post(post).user(user).build();
        em.persist(parent);

        Comment child1 = Comment.builder()
                .content("자식1")
                .post(post)
                .user(user)
                .parent(parent)
                .build();
        Comment child2 = Comment.builder()
                .content("자식2")
                .post(post)
                .user(user)
                .parent(parent)
                .build();
        em.persist(child1);
        em.persist(child2);

        em.flush();
        em.clear();

        // when
        Comment foundParent = commentRepository.findById(parent.getId()).orElseThrow();

        // then
        assertThat(foundParent.getReplyCount()).isEqualTo(2L);
    }
}
