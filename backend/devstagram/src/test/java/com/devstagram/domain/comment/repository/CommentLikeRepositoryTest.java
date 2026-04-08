package com.devstagram.domain.comment.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.entity.CommentLike;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.User;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CommentLikeRepositoryTest {

    @Autowired
    private CommentLikeRepository commentLikeRepository;

    @Autowired
    private TestEntityManager em;

    @Test
    @DisplayName("[댓글 좋아요 조회]")
    void findByCommentIdAndUserId_Success() {
        // 1. given
        User user = User.builder()
                .nickname("testUser")
                .email("test@example.com")
                .password("password123!")
                .birthDate(LocalDate.of(1999, 9, 9))
                .gender(Gender.MALE)
                .build();
        em.persist(user);

        Post post = Post.builder().title("테스트 제목").content("테스트 내용").user(user).build();
        em.persist(post);

        Comment comment =
                Comment.builder().content("content").post(post).user(user).build();
        em.persist(comment);

        CommentLike like = CommentLike.builder().user(user).comment(comment).build();
        em.persist(like);

        em.flush();
        em.clear();

        // 2. when
        boolean exists = commentLikeRepository
                .findByCommentIdAndUserId(comment.getId(), user.getId())
                .isPresent();

        // 3. then
        assertThat(exists).isTrue();
    }
}
