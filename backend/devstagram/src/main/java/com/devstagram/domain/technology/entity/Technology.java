package com.devstagram.domain.technology.entity;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 시스템에서 관리하는 기술 스택(Java, Spring Boot, React 등)의 마스터 데이터를 정의합니다.
 * 게시글 태그 등록, 사용자 기술 점수 산정 등의 기초가 되는 엔티티입니다.
 */
@Entity
@Table(name = "technology")
@Getter
@Builder
@AllArgsConstructor
@AttributeOverride(name = "id", column = @Column(name = "tech_id"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Technology extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private TechCategory category;

    @Column(name = "tech_name", nullable = false)
    private String name;

    @Column(name = "icon_url")
    private String iconUrl;

    @Column(name = "color")
    private String color;
}
