package com.devstagram.domain.post.repository;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.global.config.JpaAuditConfig;

@DataJpaTest
@Import(JpaAuditConfig.class)
class PostRepositoryTest {

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("실제 DB에 Post가 저장되고 ID와 생성시간이 할당된다")
    void save_Real_DB_Test() {
        // given
        Post post = Post.builder().title("실제 제목").content("실제 내용").build();

        // when
        Post savedPost = postRepository.save(post); // 실제 DB에 저장!

        // then
        assertThat(savedPost.getId()).isNotNull(); // ID가 IDENTITY 전략으로 자동 생성됐는가?
        assertThat(savedPost.getCreatedAt()).isNotNull(); // BaseEntity가 작동했는가?
        assertThat(savedPost.getTitle()).isEqualTo("실제 제목");
    }
}
