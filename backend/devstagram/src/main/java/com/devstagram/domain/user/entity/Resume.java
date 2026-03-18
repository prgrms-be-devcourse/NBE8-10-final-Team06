package com.devstagram.domain.user.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Resume {
    UNDERGRADUATE("학부생"),
    JUNIOR("주니어 개발자 (1~3년차)"),
    INTERMEDIATE("미들급 개발자 (3~7년차)"),
    SENIOR("시니어 개발자 (7년차+)");

    private final String description;
}
