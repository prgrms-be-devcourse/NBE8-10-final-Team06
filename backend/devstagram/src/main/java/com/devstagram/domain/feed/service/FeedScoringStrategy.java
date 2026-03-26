package com.devstagram.domain.feed.service;

import org.springframework.stereotype.Component;

import com.devstagram.domain.post.entity.Post;

@Component
public class FeedScoringStrategy {

    // 모든 기준을 밀리초(ms) 단위의 '시간'으로 통일합니다.
    private static final double HOUR = 3_600_000.0; // 1시간
    private static final double MINUTE = 60_000.0; // 1분
    private static final double DAY = 86_400_000.0; // 24시간

    /**
     * 게시글의 최종 피드 점수를 계산합니다.
     * @param post 대상 게시글
     * @param isFollower 현재 피드 주인(유저)이 작성자를 팔로우 중인지 여부
     * @param isTechMatched 현재 피드 주인(유저)의 관심 기술 태그와 일치하는지 여부
     * @return ZSet의 Score로 저장될 double 값
     */
    public double calculateScore(Post post, boolean isFollower, boolean isTechMatched) {
        // 1. 기본 신선도 (Recency)
        // 현재 시간을 베이스로 깔아줌으로써, 새로 올라온 글이 기본적으로 높은 점수를 받습니다.
        double score = (double) System.currentTimeMillis();

        // 2. 기술 태그 가중치 (관심사 우선순위)
        // 내 관심 태그라면, 24시간 전에 올라온 글이라도 방금 올라온 일반 글과 대등하게 경쟁합니다.
        if (isTechMatched) {
            score += DAY;
        }

        // 3. 팔로우 가중치 (인간관계 우선순위)
        // 내가 팔로우한 사람의 글은 반나절(12시간)의 점수 보너스를 받습니다.
        if (isFollower) {
            score += (DAY / 2);
        }

        // 4. 인기도 가중치 (Hot 게시글)
        // 좋아요 1개당 1시간의 수명을 연장해 줍니다.
        // 좋아요가 24개 모이면 관심 태그가 없는 글도 내 취향 글을 추월할 수 있습니다.
        score += (post.getLikeCount() * MINUTE);

        return score;
    }
}
