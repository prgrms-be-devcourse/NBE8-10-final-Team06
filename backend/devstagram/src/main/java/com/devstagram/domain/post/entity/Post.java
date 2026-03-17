package com.devstagram.domain.post.entity;

import java.util.List;

import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.global.entity.BaseEntity;

public class Post extends BaseEntity {

    String title;

    String content;

    String thumbnailUrl;

    Long likeCount;

    Long commentCount;

    List<PostMedia> postMedia;

    List<Comment> comment;

    List<PostLike> postLikeList;
}
