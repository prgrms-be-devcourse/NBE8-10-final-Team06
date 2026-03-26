package com.devstagram.domain.feed.service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.devstagram.domain.technology.service.TechScoreService;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.service.FollowService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final StringRedisTemplate redisTemplate;
    private final FeedScoringStrategy scoringStrategy;
    private final FollowRepository  followRepository;
    private final TechScoreService techScoreService;

    private static final double MINUTE = 60_000.0;
    private static final double HOUR = 3_600_000.0;
    private static final double DAY = 86_400_000.0;

    private static final short MIN_SCORE= 50;

    private static final String FEED_KEY_PREFIX = "feed:user:";
    private static final int MAX_FEED_SIZE = 500; // 유저당 정예 멤버 500개 유지

    /**
     * 통합된 타겟 유저들에게 게시글 배달
     * @param post 작성된 게시글
     * @param targetUsers 배달 대상 (팔로워 + 기술 관심 유저 통합 리스트)
     */
    @Async("feedTaskExecutor")
    public void deliverPostToFeeds(Post post, List<User> targetUsers) {
        for (User user : targetUsers) {
            // 개별 유저마다 '나와의 관계'에 따른 점수를 계산해야 하므로 체크 로직 필요
            // Tip: 이 체크 로직은 Redis나 메모리 캐시를 활용하면 더 빠릅니다.
            boolean isFollower = checkIfFollower(post.getUser(), user);
            boolean isTechMatched = checkIfTechMatched(post, user);

            double score = scoringStrategy.calculateScore(post, isFollower, isTechMatched);
            pushToZSet(post, user, score);
        }
    }

    private void pushToZSet(Post post, User user, double score) {
        String key = FEED_KEY_PREFIX + user.getId();
        String postId = String.valueOf(post.getId());

        redisTemplate.opsForZSet().add(key, postId, score);

        // Capping 로직 유지
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

    /**
     * [수정] 좋아요 발생 시 통합된 타겟 유저들의 점수 실시간 업데이트
     * @param post 대상 게시글
     * @param targetUsers 점수 수정 대상 (팔로워 + 기술 관심 유저 통합 리스트)
     * @param isIncrement true(증가), false(감소)
     */
    @Async("feedTaskExecutor")
    public void updatePostScoreInFeeds(Post post, List<User> targetUsers, boolean isIncrement) {
        double delta = isIncrement ? MINUTE : -MINUTE;
        String postId = String.valueOf(post.getId());

        for (User user : targetUsers) {
            String key = FEED_KEY_PREFIX + user.getId();
            // ZINCRBY: 해당 postId가 ZSet에 있을 때만 점수가 변동됨
            redisTemplate.opsForZSet().incrementScore(key, postId, delta);
        }

        // 작성자 본인의 피드 점수도 별도 처리 (targetUsers에 본인이 포함 안 되었을 경우)
        String ownerKey = FEED_KEY_PREFIX + post.getUser().getId();
        redisTemplate.opsForZSet().incrementScore(ownerKey, postId, delta);
    }

    /**
     * 팔로우 여부 확인
     * (성능을 위해 Redis에 팔로우 관계가 저장되어 있다면 Redis를 우선 조회하는 것이 좋습니다)
     */
    private boolean checkIfFollower(User author, User reader) {
        if (author.getId().equals(reader.getId())) return false;
        // FollowRepository를 통해 DB 조회 (또는 Redis Set 조회)
        return followRepository.existsByFromUserIdAndToUserId(reader.getId(), author.getId());
    }

    /**
     * 기술 태그 일치 여부 확인
     * 게시글의 태그 중 하나라도 유저의 관심 태그(점수 보유 태그)에 포함되는지 확인
     */
    private boolean checkIfTechMatched(Post post, User reader) {
        // 게시글의 기술 ID 목록
        Set<Long> postTechIds = post.getTechTags().stream()
                .map(pt -> pt.getTechnology().getId())
                .collect(Collectors.toSet());

        // 유저가 점수를 보유한(관심 있는) 기술 ID 목록 조회 (TechScoreService 이용)
        Set<Long> userInterestedTechIds = techScoreService.getInterestedTechIds(reader.getId(), MIN_SCORE);

        // 교집합이 있는지 확인
        return !Collections.disjoint(postTechIds, userInterestedTechIds);
    }
}
