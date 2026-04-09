package com.devstagram.domain.post.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record PostUpdateReq(
        @NotBlank(message = "제목을 입력하세요.") String title,
        @NotBlank(message = "글을 입력하세요.") String content,
        List<Long> techIds,
        /**
         * null: 미디어 필드는 변경하지 않음.<br>
         * non-null: 유지할 기존 미디어의 sourceUrl 목록(게시글에 있던 값과 동일·순서 유지) + multipart files는 그 뒤에 붙는 신규 파일만.
         */
        List<String> retainedMediaUrls) {}
