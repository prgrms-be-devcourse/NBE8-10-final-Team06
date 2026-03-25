package com.devstagram.domain.technology.entity;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Post(게시글)와 Technology(기술 태그) 사이의 다대다(N:M) 관계를 해소하기 위한 매핑 엔티티입니다.
 * 단순 매핑을 넘어, 카테고리 정보(TechCategory)를 포함하여 조회 성능을 최적화합니다.
 */
@Entity
@Table(name = "post_technology")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostTechnology extends BaseEntity {

    // 연결된 기술 태그 정보
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tech_id", nullable = false)
    private Technology technology;

    /**
     * 해당 기술이 속한 카테고리 정보입니다.
     * Technology를 거쳐 조회하지 않고 직접 접근할 수 있도록 반정규화하여
     * 특정 카테고리별 게시글 필터링 성능을 높였습니다.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private TechCategory category;

    // 해당 태그가 포함된 게시글
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    /**
     * 매핑 엔티티 생성 시 필요한 모든 연관관계를 주입받습니다.
     * 주로 Post 엔티티의 addTechTag() 편의 메서드 내부에서 사용됩니다.
     */
    @Builder
    public PostTechnology(Technology technology, TechCategory category, Post post) {
        this.technology = technology;
        this.category = category;
        this.post = post;
    }
}
