package com.devstagram.domain.comment.constant;

public class CommentConstants {

    private CommentConstants() {}

    // 댓글 페이징 사이즈
    public static final int COMMENT_PAGE_SIZE = 10;

    // 대댓글 페이징 사이즈
    public static final int REPLY_PAGE_SIZE = 5;

    // 기본 정렬 기준 필드
    public static final String DEFAULT_SORT_FIELD = "createdAt";
}
