package com.devstagram.domain.technology.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자의 기술별 활동 점수 및 통계를 관리하는 엔티티입니다.
 * 특정 기술(Technology)에 대한 사용자의 숙련도나 관심도를 수치화합니다.
 */
@Entity
@Table(
        name = "user_tech_score",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_user_tech",
                    columnNames = {"user_id", "tech_id"})
        })
@Getter
@AttributeOverride(name = "id", column = @Column(name = "user_tech_score_id"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTechScore extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tech_id", nullable = false)
    private Technology technology;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private TechCategory category;

    private int score;
    private int postCount; // 해당 기술 태그로 작성한 게시글 수
    private int likeCount; // 해당 기술 태그 게시글에서 받은 총 좋아요 수
    private int scrapCount; // 해당 기술 태그 게시글이 스크랩된 횟수

    /**
     * 새로운 기술 점수 기록을 생성합니다. 초기값은 모두 0으로 설정됩니다.
     */
    public UserTechScore(User user, Technology technology, TechCategory category) {
        this.user = user;
        this.technology = technology;
        this.category = category;
        this.score = 0;
        this.postCount = 0;
        this.likeCount = 0;
        this.scrapCount = 0;
    }

    // ================= [ 비즈니스 로직: 가중치 및 카운트 증가 ] =================

    /**
     * 활동 유형에 따른 가중치 점수를 추가합니다.
     * @param amount 활동별 정의된 가중치 (예: POST=20, LIKE=5)
     */
    public void increaseScore(int amount) {
        this.score += amount;
    }

    public void increasePostCount() {
        this.postCount++;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void increaseScrapCount() {
        this.scrapCount++;
    }

    // ================= [ 비즈니스 로직: 가중치 및 카운트 차감 ] =================
    // 게시글 삭제, 좋아요 취소 등의 이벤트 발생 시 호출됩니다.

    /**
     * 점수를 차감하며, 결과가 음수가 되지 않도록 보정합니다.
     */
    public void decreaseScore(int amount) {
        this.score = Math.max(0, this.score - amount);
    }

    /**
     * 각 활동 카운트를 차감하며, 0 미만으로 내려가지 않도록 방어 로직을 포함합니다.
     */
    public void decreasePostCount() {
        if (this.postCount > 0) this.postCount--;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) this.likeCount--;
    }

    public void decreaseScrapCount() {
        if (this.scrapCount > 0) this.scrapCount--;
    }
}
