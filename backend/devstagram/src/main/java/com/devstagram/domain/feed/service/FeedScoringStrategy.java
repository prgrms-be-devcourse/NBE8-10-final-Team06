package com.devstagram.domain.feed.service;

import java.time.ZoneId;

import org.springframework.stereotype.Component;

import com.devstagram.domain.post.entity.Post;

@Component
public class FeedScoringStrategy {

    // 2026.01.01 한국 기준 시각
    private static final long BASE_TIME = 1735657200000L;

    private static final double MINUTE = 1.0;
    private static final double HOUR = 60.0 * MINUTE;
    private static final double DAY = 24.0 * HOUR;

    private static final double LIKE_WEIGHT = 10.0 * MINUTE;

    /**
     * 게시글의 최종 피드 점수를 계산 (언제 호출해도 결과가 일정함)
     */
    public double calculateScore(Post post, boolean isFollower, boolean isTechMatched) {

        long postMillis =
                post.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        double score = (double) (postMillis - BASE_TIME) / 60_000.0;

        if (isTechMatched) {
            // 기술 매칭 시 좋아요 약 20개 정도의 가점 (200분)
            score += (200 * MINUTE);
        }

        if (isFollower) {
            // 팔로워일 시 좋아요 약 30개 정도의 가점 (300분)
            score += (300 * MINUTE);
        }

        // 누적 좋아요 점수 합산
        score += (post.getLikeCount() * LIKE_WEIGHT);

        return score;
    }

    /**
     * 좋아요 증감에 따른 점수 변동폭 (calculateScore의 가중치와 반드시 일치해야 함)
     */
    public double getLikeDelta(boolean isIncrement) {
        return isIncrement ? LIKE_WEIGHT : -LIKE_WEIGHT;
    }
}
