package com.devstagram.domain.technology.dto;

import jakarta.validation.constraints.NotBlank;

public record TechCategoryCreateReq(
        @NotBlank(message = "카테고리 이름을 입력하세요.") String name,
        @NotBlank(message = "카테고리 색상을 입력하세요.") String color
) {
}
