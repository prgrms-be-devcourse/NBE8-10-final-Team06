package com.devstagram.domain.feed.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Duration;
import java.util.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.connection.zset.Aggregate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.service.TechScoreService;
import com.devstagram.domain.user.repository.FollowRepository;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @InjectMocks
    private FeedService feedService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private FeedScoringStrategy scoringStrategy;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private TechScoreService techScoreService;

    @Mock
    private ZSetOperations<String, String> zSetOperations;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
    }

    @Test
    @DisplayName("게시글 생성 시 글로벌 피드(Redis)에 정확한 점수로 등록되어야 한다")
    void registerPostToGlobalFeed_Success() {
        // given
        Post post = Post.builder().title("테스트 제목").content("테스트 내용").build();
        ReflectionTestUtils.setField(post, "id", 100L);
        double expectedScore = 1500.0;
        when(scoringStrategy.calculateGlobalScore(any())).thenReturn(expectedScore);

        // when
        feedService.registerPostToGlobalFeed(post);

        // then
        verify(zSetOperations).add("posts:global:scores", "100", expectedScore);
    }

    @Test
    @DisplayName("하이브리드 피드 조회 시 개인 피드와 글로벌 피드가 합쳐져야 한다")
    void getHybridFeedWithScores_Success() {
        // given
        Long memberId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        String userFeedKey = "feed:user:1";
        String globalFeedKey = "posts:global:scores";

        Set<ZSetOperations.TypedTuple<String>> mockResults = new LinkedHashSet<>();
        mockResults.add(ZSetOperations.TypedTuple.of("102", 2000.0));
        mockResults.add(ZSetOperations.TypedTuple.of("101", 1800.0));

        when(zSetOperations.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
                .thenReturn(mockResults);

        // when
        Map<Long, Double> result = feedService.getHybridFeedWithScores(memberId, pageable);

        // then
        verify(zSetOperations)
                .unionAndStore(eq(userFeedKey), eq(List.of(globalFeedKey)), anyString(), eq(Aggregate.SUM), any());
        verify(redisTemplate, times(2)).expire(anyString(), any(Duration.class));
        assertThat(result).hasSize(2);
        assertThat(result.get(102L)).isEqualTo(2000.0);
        verify(redisTemplate).delete(anyString());
    }

    @Test
    @DisplayName("좋아요 클릭 시 글로벌 피드의 점수가 가중치만큼 증가해야 한다")
    void updatePostScoreInGlobalFeed_Increment() {
        // given
        Post post = Post.builder().title("테스트 제목").content("테스트 내용").build();

        Long testId = 100L;
        ReflectionTestUtils.setField(post, "id", testId);

        double likeWeight = 10.0;
        when(scoringStrategy.getLikeDelta(any(Post.class), eq(true))).thenReturn(likeWeight);

        // when
        feedService.updatePostScoreInGlobalFeed(post, true);

        // then
        verify(zSetOperations).incrementScore("posts:global:scores", String.valueOf(testId), likeWeight);
        verify(zSetOperations).size("posts:global:scores");
    }
}
