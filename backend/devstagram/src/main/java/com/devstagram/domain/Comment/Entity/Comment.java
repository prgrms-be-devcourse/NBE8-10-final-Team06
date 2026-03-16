package com.devstagram.domain.Comment.Entity;

import com.devstagram.domain.Post.Entity.Post;
import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

import java.util.List;

public class Comment extends BaseEntity {

    User user;

    Post post;

    String content;

    List<CommentLike> commentLikeList;
}
