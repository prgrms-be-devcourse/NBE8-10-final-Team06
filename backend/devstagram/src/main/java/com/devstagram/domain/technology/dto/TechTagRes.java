package com.devstagram.domain.technology.dto;

import com.devstagram.domain.technology.entity.PostTechnology;

public record TechTagRes(Long id, String name, String color) {
    public static TechTagRes from(PostTechnology postTech) {
        return new TechTagRes(
                postTech.getTechnology().getId(),
                postTech.getTechnology().getName(),
                postTech.getTechnology().getColor());
    }
}
