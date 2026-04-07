package com.devstagram.domain.feed.service;

import java.time.ZoneId;

import org.springframework.stereotype.Component;

import com.devstagram.domain.post.entity.Post;

@Component
public class FeedScoringStrategy {

    // ==============================
    // 📊 Global Score Weight
    // ==============================
    private static final double LIKE_WEIGHT = 10.0;

    // ==============================
    // 🎯 Personal Score Weight
    // ==============================
    private static final double TECH_MATCH_WEIGHT = 40.0;
    private static final double FOLLOWER_WEIGHT = 20.0;

    // ==============================
    // ⏳ Time Decay
    // ==============================
    private static final double GRAVITY = 1.5;
    private static final double TIME_SMOOTHING = 2.0;

    // ==============================
    // ✅ Global Score (인기 기반)
    // ==============================
    public double calculateGlobalScore(Post post) {
        double baseScore = post.getLikeCount() * LIKE_WEIGHT;
        return applyTimeDecay(post, baseScore);
    }

    // ==============================
    // ✅ Personal Score (유저 맞춤)
    // ==============================
    public double calculatePersonalScore(Post post, boolean isFollower, boolean isTechMatched, int matchCount) {
        double score = 0.0;

        if (isTechMatched) {
            score += TECH_MATCH_WEIGHT * matchCount;
        }

        if (isFollower) {
            score += FOLLOWER_WEIGHT;
        }

        return applyTimeDecay(post, score);
    }

    // ==============================
    // 🔥 좋아요 증감 반영 (Global 전용)
    // ==============================
    public double getLikeDelta(Post post, boolean isIncrement) {
        double delta = LIKE_WEIGHT;
        double decayed = applyTimeDecay(post, delta);
        return isIncrement ? decayed : -decayed;
    }

    // ==============================
    // ⏳ Time Decay 공통 함수
    // ==============================
    private double applyTimeDecay(Post post, double score) {
        long postMillis =
                post.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

        long nowMillis = System.currentTimeMillis();

        double hoursPassed = (double) (nowMillis - postMillis) / (1000.0 * 60 * 60);

        return score / Math.pow(hoursPassed + TIME_SMOOTHING, GRAVITY);
    }
}
