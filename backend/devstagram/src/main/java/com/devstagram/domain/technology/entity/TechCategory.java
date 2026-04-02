package com.devstagram.domain.technology.entity;

import java.util.ArrayList;
import java.util.List;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 기술 스택의 대분류(카테고리)를 정의하는 엔티티입니다.
 * 예: Backend, Frontend, DevOps, Database 등
 * 시스템 전반의 통계 및 필터링의 기준점이 됩니다.
 */
@Entity
@Table(name = "tech_category")
@Getter
@AttributeOverride(name = "id", column = @Column(name = "category_id"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TechCategory extends BaseEntity {

    @Column(name = "category_name", nullable = false)
    private String name;

    @Column(name = "color", nullable = false)
    private String color;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @OneToMany(mappedBy = "category", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<Technology> technologies = new ArrayList<>();

    @OneToMany(mappedBy = "category", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<PostTechnology> postTechnologies = new ArrayList<>();

    @Builder
    public TechCategory(Long id, String name, String color) {
        this.id = id;
        this.name = name;
        this.color = color;
    }

    public void update(String name, String color) {
        this.name = name;
        this.color = color;
    }
}
