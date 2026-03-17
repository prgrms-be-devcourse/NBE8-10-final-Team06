package com.devstagram.domain.Post.Entity;

import java.util.List;

import com.devstagram.domain.Comment.Entity.Comment;
import com.devstagram.global.Entity.BaseEntity;

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
