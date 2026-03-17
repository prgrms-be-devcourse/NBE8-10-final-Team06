package com.devstagram.domain.comment.entity;

import java.util.List;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

public class Comment extends BaseEntity {

    User user;

    Post post;

    String content;

    List<CommentLike> commentLikeList;
}
