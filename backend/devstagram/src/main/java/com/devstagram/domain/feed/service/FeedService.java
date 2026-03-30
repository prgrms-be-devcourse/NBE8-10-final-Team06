package com.devstagram.domain.feed.service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.data.domain.Pageable;
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
    private static final short TECH_MATCH_THRESHOLD = 50;
    private static final int TOP_K_LIMIT = 1000;

    // 업로드된 게시글을 개인 피드에 등록
    @Async("feedTaskExecutor")
    public void deliverPostToFeeds(Post post) {

        // 팔로워들과 기술태그 일치 사용자들을 먼저 set해서 가져옴
        List<User> targetUsers = findTargetUsersForPost(post);

        String postId = String.valueOf(post.getId());

        // 기술태그인지 팔로우 계정인지 확인해서 점수 산정
        for (User user : targetUsers) {
            boolean isFollower = checkIfFollower(post.getUser(), user);
            boolean isTechMatched = checkIfTechMatched(post, user);

            double score = scoringStrategy.calculateScore(post, isFollower, isTechMatched);
            pushToUserFeed(user.getId(), postId, score);
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

    // 팔로우 중인 계정인지 확인
    private boolean checkIfFollower(User author, User reader) {
        if (author.getId().equals(reader.getId())) return false;
        return followRepository.existsByFromUserIdAndToUserId(reader.getId(), author.getId());
    }

    // 기술태그가 일치하는지 확인
    private boolean checkIfTechMatched(Post post, User reader) {
        Set<Long> postTechIds = post.getTechTags().stream()
                .map(pt -> pt.getTechnology().getId())
                .collect(Collectors.toSet());

        Set<Long> interestedTechIds = techScoreService.getInterestedTechIds(reader.getId(), TECH_MATCH_THRESHOLD);
        return !Collections.disjoint(postTechIds, interestedTechIds);
    }

    // 사용자 공통 글로벌 점수에 등록
    public void registerPostToGlobalFeed(Post post) {

        double baseScore = scoringStrategy.calculateScore(post, false, false);

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
        List<User> techInterestedUsers = techScoreService.findUsersByTechTags(post.getTechTags());
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

    // 좋아요 증감을 통한 글로벌 피드 점수 수정
    @Async("feedTaskExecutor")
    public void updatePostScoreInGlobalFeed(Post post, boolean isIncrement) {
        String postId = String.valueOf(post.getId());

        // 가중치 가져오기
        double delta = scoringStrategy.getLikeDelta(isIncrement);

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
        String tempKey = "temp:feed:" + memberId; // 계산을 위한 임시 장부

        // Redis ZUNION 실행
        // 두 점수를 동등한 비율로 합산한다는 뜻
        redisTemplate.opsForZSet().unionAndStore(userFeedKey, GLOBAL_FEED_KEY, tempKey);

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
