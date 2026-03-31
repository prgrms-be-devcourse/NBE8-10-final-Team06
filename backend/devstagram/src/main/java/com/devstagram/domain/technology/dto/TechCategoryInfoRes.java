package com.devstagram.domain.technology.dto;

import com.devstagram.domain.technology.entity.TechCategory;
import lombok.Builder;

@Builder
public record TechCategoryInfoRes(
        Long id,
        String name,
        String color
) {
    public static TechCategoryInfoRes from(TechCategory techCategory) {
        return TechCategoryInfoRes.builder()
                .id(techCategory.getId())
                .name(techCategory.getName())
                .color(techCategory.getColor())
                .build();
    }
}
