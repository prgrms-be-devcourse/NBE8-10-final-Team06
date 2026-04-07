package com.devstagram.domain.technology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TechCreateReq(
        @NotNull(message = "카테고리를 선택해주세요.") Long categoryId,
        @NotBlank(message = "기술 이름을 입력하세요.") String name,
        @NotBlank(message = "기술 색상을 입력하세요.") String color) {}
