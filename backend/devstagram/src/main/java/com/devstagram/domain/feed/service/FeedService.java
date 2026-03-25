package com.devstagram.domain.feed.service;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final StringRedisTemplate redisTemplate;
    private final FeedScoringStrategy scoringStrategy;

    private static final String FEED_KEY_PREFIX = "feed:user:";
    private static final int MAX_FEED_SIZE = 500; // 유저당 정예 멤버 500개 유지

    /**
     * 비동기로 게시글을 관련 유저들의 피드(ZSet)에 배달합니다.
     * @param post 작성된 게시글
     * @param followers 작성자를 팔로우하는 유저 리스트
     * @param techInterestedUsers 해당 기술 태그를 선호하는 유저 리스트
     */
    @Async("feedTaskExecutor") // Commit 2에서 만든 스레드 풀 사용
    public void deliverPostToFeeds(Post post, List<User> followers, List<User> techInterestedUsers) {



        // 1. 배달 대상 선정 (팔로워 + 기술 관심 유저)
        // 중복 배달을 막기 위해 로직 내에서 처리하거나 호출부에서 Set으로 넘겨받는 것이 좋습니다.

        // 2. 팔로워들에게 배달
        for (User follower : followers) {
            pushToZSet(post, follower, true, false);
        }

        // 3. 기술 관심 유저들에게 배달 (이미 팔로워라면 점수 재계산 필요할 수 있음)
        for (User techUser : techInterestedUsers) {
            pushToZSet(post, techUser, false, true);
        }
    }

    private void pushToZSet(Post post, User user, boolean isFollower, boolean isTechMatched) {
        String key = FEED_KEY_PREFIX + user.getId();
        String postId = String.valueOf(post.getId());

        // 알고리즘 엔진을 통해 나만의 점수 계산
        double score = scoringStrategy.calculateScore(post, isFollower, isTechMatched);

        // Redis ZSet에 추가 (ZADD)
        redisTemplate.opsForZSet().add(key, postId, score);

        // Capping: 500개가 넘어가면 점수가 가장 낮은(가장 오래된/관심없는) 데이터 삭제
        // ZSet은 기본 오름차순이므로 0번 인덱스부터 (전체 - 501)까지 지우면 상위 500개만 남습니다.
        Long size = redisTemplate.opsForZSet().size(key);
        if (size != null && size > MAX_FEED_SIZE) {
            redisTemplate.opsForZSet().removeRange(key, 0, size - MAX_FEED_SIZE - 1);
        }
    }

    // FeedService.java 내부
    @Transactional(readOnly = true)
    public List<Long> getRankedPostIds(Long userId, Pageable pageable) {
        String key = FEED_KEY_PREFIX + userId;
        long start = pageable.getOffset();
        long end = start + pageable.getPageSize() - 1;

        // 점수 높은 순(내림차순)으로 ID 추출
        Set<String> postIds = redisTemplate.opsForZSet().reverseRange(key, start, end);

        if (postIds == null || postIds.isEmpty()) {
            return Collections.emptyList();
        }

        return postIds.stream().map(Long::valueOf).toList();
    }

    @Async("feedTaskExecutor")
    public void removePostFromFeeds(Long postId, List<User> followers) {
        String StringPostId = String.valueOf(postId);

        // 나를 팔로우했던 사람들의 우체통에서만 지워도 충분합니다.
        for (User follower : followers) {
            String key = FEED_KEY_PREFIX + follower.getId();
            redisTemplate.opsForZSet().remove(key, StringPostId);
        }

        // 작성자 본인의 피드에서도 지워줍니다.
        // (본인 글도 피드에 보이게 설계했다면 필요함)
    }
}

