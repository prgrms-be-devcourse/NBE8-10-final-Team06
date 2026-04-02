package com.devstagram.domain.feed.service;

import java.time.ZoneId;

import org.springframework.stereotype.Component;

import com.devstagram.domain.post.entity.Post;

@Component
public class FeedScoringStrategy {

    // 점수 산정에 필요한 가중치 상수 (분자값 결정)
    private static final double LIKE_WEIGHT = 10.0; // 좋아요 1개당 10점
    private static final double TECH_MATCH_WEIGHT = 20.0; // 기술 스택 일치 시 20점
    private static final double FOLLOWER_WEIGHT = 30.0; // 팔로워 게시글일 시 30점

    // 시간 감쇄 관련 상수 (분모값 결정)
    private static final double GRAVITY = 1.8; // 시간의 중력 (값이 클수록 빨리 하락)
    private static final double TIME_SMOOTHING = 2.0; // 초기 발산 방지용 보정치

    /**
     * 게시글의 최종 피드 점수를 계산 (Hacker News 알고리즘 기반)
     */
    public double calculateScore(Post post, boolean isFollower, boolean isTechMatched) {
        // 인기도 점수 산정
        double baseScore = post.getLikeCount() * LIKE_WEIGHT;

        if (isTechMatched) baseScore += TECH_MATCH_WEIGHT;
        if (isFollower) baseScore += FOLLOWER_WEIGHT;

        // 경과 시간 계산 (Hour 단위)
        long postMillis =
                post.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long nowMillis = System.currentTimeMillis();
        double hoursPassed = (double) (nowMillis - postMillis) / (1000.0 * 60 * 60);

        // 최종 점수 반환 (지수 감쇄 적용)
        return baseScore / Math.pow(hoursPassed + TIME_SMOOTHING, GRAVITY);
    }

    /**
     * 좋아요 클릭 시 실시간 반영을 위한 변화량
     * (calculateScore의 LIKE_WEIGHT와 반드시 일치해야 함)
     */
    public double getLikeDelta(boolean isIncrement) {
        return isIncrement ? LIKE_WEIGHT : -LIKE_WEIGHT;
    }
}
