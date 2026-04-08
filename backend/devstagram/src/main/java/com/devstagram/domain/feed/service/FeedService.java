package com.devstagram.domain.feed.service;

import java.time.Duration;
import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.connection.zset.Aggregate;
import org.springframework.data.redis.connection.zset.Weights;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.technology.service.TechScoreService;
import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final StringRedisTemplate redisTemplate;
    private final FeedScoringStrategy scoringStrategy;
    private final FollowRepository followRepository;
    private final TechScoreService techScoreService;

    private static final String USER_FEED_PREFIX = "feed:user:";
    private static final String GLOBAL_FEED_KEY = "posts:global:scores";
    private static final int MAX_FEED_SIZE = 500;
    private static final int TOP_K_LIMIT = 1000;

    // 업로드된 게시글을 개인 피드에 등록
    @Async("feedTaskExecutor")
    public void deliverPostToFeeds(Post post, List<Long> techIds) {

        // 팔로워 ID 셋 (1번 쿼리)
        Set<Long> followerIds = followRepository
                .findAllByToUserId(post.getUser().getId())
                .stream()
                .map(f -> f.getFromUser().getId())
                .collect(Collectors.toSet());

        // userId → 매칭된 techId Set (1번 쿼리)
        Map<Long, Set<Long>> userTechMap = techScoreService.findUserTechMapByTechIds(techIds);

        // 합집합에서 작성자 제외
        Set<Long> targetIds = new HashSet<>(followerIds);
        targetIds.addAll(userTechMap.keySet());
        targetIds.remove(post.getUser().getId());

        String postId = String.valueOf(post.getId());

        for (Long userId : targetIds) {
            boolean isFollower = followerIds.contains(userId);
            int matchCount = userTechMap.getOrDefault(userId, Set.of()).size();
            boolean isTechMatched = matchCount > 0;
            double score = scoringStrategy.calculatePersonalScore(post, isFollower, isTechMatched, matchCount);
            pushToUserFeed(userId, postId, score);
        }
    }

    // 사용자 개별 전용 피드를 구축 (500개 제한)
    private void pushToUserFeed(Long userId, String postId, double score) {
        String key = USER_FEED_PREFIX + userId;
        redisTemplate.opsForZSet().add(key, postId, score);

        // 큐 크기 제한
        Long size = redisTemplate.opsForZSet().size(key);
        if (size != null && size > MAX_FEED_SIZE) {
            redisTemplate.opsForZSet().removeRange(key, 0, size - MAX_FEED_SIZE - 1);
        }
    }

    // 사용자 공통 글로벌 점수에 등록
    public void registerPostToGlobalFeed(Post post) {

        double baseScore = scoringStrategy.calculateGlobalScore(post);

        redisTemplate.opsForZSet().add(GLOBAL_FEED_KEY, String.valueOf(post.getId()), baseScore);
    }

    // 팔로워들과 기술태그 겹치는 사람들을 합친 set을 보냄
    public List<User> findTargetUsersForPost(Post post) {
        // 중복 방지를 위한 Set 생성
        Set<User> targetSet = new HashSet<>();

        // 나(작성자)를 팔로우하는 사람들 조회 및 추가
        List<Follow> follows = followRepository.findAllByToUserId(post.getUser().getId());
        follows.stream().map(Follow::getFromUser).forEach(targetSet::add);

        // 게시글의 기술 태그(PostTechnology) 기반 관심 유저들 추가
        List<User> techInterestedUsers = techScoreService.findUsersByTechTags(new ArrayList<>(post.getTechTags()));
        targetSet.addAll(techInterestedUsers);

        // 작성자 본인은 피드 배달 대상에서 제외
        targetSet.remove(post.getUser());

        return new ArrayList<>(targetSet);
    }

    @Async("feedTaskExecutor")
    public void removePostFromFeeds(Long postId, List<Long> targetUserIds, Long authorId) {
        String stringPostId = String.valueOf(postId);

        // 글로벌 피드에서 즉시 제거
        redisTemplate.opsForZSet().remove(GLOBAL_FEED_KEY, stringPostId);

        // 타겟 유저들 주머니에서 제거
        for (Long targetId : targetUserIds) {
            redisTemplate.opsForZSet().remove(USER_FEED_PREFIX + targetId, stringPostId);
        }

        // 작성자 본인 주머니에서도 제거
        redisTemplate.opsForZSet().remove(USER_FEED_PREFIX + authorId, stringPostId);
    }

    // 피드 조회 시 DB에 없는 stale 항목 lazy cleanup
    @Async("feedTaskExecutor")
    public void removeStalePostsFromFeeds(Long memberId, List<Long> stalePostIds) {
        Object[] staleValues = stalePostIds.stream().map(String::valueOf).toArray();
        redisTemplate.opsForZSet().remove(USER_FEED_PREFIX + memberId, staleValues);
        redisTemplate.opsForZSet().remove(GLOBAL_FEED_KEY, staleValues);
    }

    // 좋아요 증감을 통한 글로벌 피드 점수 수정
    @Async("feedTaskExecutor")
    public void updatePostScoreInGlobalFeed(Post post, boolean isIncrement) {
        String postId = String.valueOf(post.getId());

        double delta = scoringStrategy.getLikeDelta(post, isIncrement);

        // 글로벌 보관함 점수 업데이트
        redisTemplate.opsForZSet().incrementScore(GLOBAL_FEED_KEY, postId, delta);

        // 최신 인기글 상위 1,000개만 남기고 나머지는 제거
        Long size = redisTemplate.opsForZSet().size(GLOBAL_FEED_KEY);
        if (size != null && size > TOP_K_LIMIT) {
            redisTemplate.opsForZSet().removeRange(GLOBAL_FEED_KEY, 0, size - TOP_K_LIMIT - 1);
        }
    }

    // 개인 피드와 글로벌 피드를 일정한 비율로 혼합
    public Map<Long, Double> getHybridFeedWithScores(Long memberId, Pageable pageable) {

        String userFeedKey = USER_FEED_PREFIX + memberId;
        String tempKey = "temp:feed:" + memberId + ":" + UUID.randomUUID();

        // 마지막 접근 시각 기준 30일 후 만료 (비활성 유저 피드 자동 정리)
        redisTemplate.expire(userFeedKey, Duration.ofDays(30));

        // 개인 피드(최대 500) + 글로벌 피드(최대 1000) 합집합, 겹치면 높은 점수 채택
        redisTemplate
                .opsForZSet()
                .unionAndStore(userFeedKey, List.of(GLOBAL_FEED_KEY), tempKey, Aggregate.SUM, Weights.of(1.2, 0.2));

        // 임시 키에 30초 정도 TTL 설정 (만약 삭제 로직이 실패해도 메모리를 보호하기 위함)
        redisTemplate.expire(tempKey, Duration.ofSeconds(30));

        // 합산된 결과에서 페이지네이션 범위만큼 추출 (역순 정렬)
        Set<ZSetOperations.TypedTuple<String>> pagedResults = redisTemplate
                .opsForZSet()
                .reverseRangeWithScores(
                        tempKey, pageable.getOffset(), pageable.getOffset() + pageable.getPageSize() - 1);

        // 계산이 끝난 임시 키 즉시 삭제
        redisTemplate.delete(tempKey);

        // 결과 반환 (ID와 점수 매핑)
        if (pagedResults == null) return Collections.emptyMap();

        return pagedResults.stream()
                .collect(Collectors.toMap(
                        t -> Long.parseLong(t.getValue()), t -> t.getScore(), (v1, v2) -> v1, LinkedHashMap::new));
    }
}
