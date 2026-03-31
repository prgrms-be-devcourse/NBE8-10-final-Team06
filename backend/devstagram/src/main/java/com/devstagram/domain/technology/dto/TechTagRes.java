package com.devstagram.domain.technology.dto;

import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.Technology;

public record TechTagRes(Long id, String name, String color) {

    // 1. 전체 조회/검색 API에서 Technology 엔티티를 직접 변환할 때 사용
    public static TechTagRes from(Technology technology) {
        return new TechTagRes(technology.getId(), technology.getName(), technology.getColor());
    }

    // 2. 게시글 상세 조회 시 매핑 엔티티(PostTechnology)에서 변환할 때 사용
    public static TechTagRes from(PostTechnology postTech) {
        // 위에서 만든 메서드를 재사용하여 중복을 제거합니다.
        return from(postTech.getTechnology());
    }
}
