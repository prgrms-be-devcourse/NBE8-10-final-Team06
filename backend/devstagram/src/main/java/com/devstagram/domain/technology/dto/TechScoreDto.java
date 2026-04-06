package com.devstagram.domain.technology.dto;

import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.entity.UserTechScore;

public record TechScoreDto(String techName, int score, double percentage) {
    public static TechScoreDto of(Technology technology, int score, double totalScore) {
        // 전체 점수 대비 해당 기술의 비중 계산 (소수점 첫째 자리까지)
        double ratio = (totalScore > 0) ? (score / totalScore) * 100 : 0;
        double roundedPercentage = Math.round(ratio * 10.0) / 10.0;

        return new TechScoreDto(technology.getName(), score, roundedPercentage);
    }
}
