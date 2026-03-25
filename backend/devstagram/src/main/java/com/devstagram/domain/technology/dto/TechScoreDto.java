package com.devstagram.domain.technology.dto;

import com.devstagram.domain.technology.entity.UserTechScore;

public record TechScoreDto(String techName, int score) {
    public static TechScoreDto from(UserTechScore userTechScore) {
        return new TechScoreDto(userTechScore.getTechnology().getName(), userTechScore.getScore());
    }
}
