package com.devstagram.domain.Comment.Entity;

import java.util.List;

import com.devstagram.domain.Post.Entity.Post;
import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class Comment extends BaseEntity {

    User user;

    Post post;

    String content;

    List<CommentLike> commentLikeList;
}
