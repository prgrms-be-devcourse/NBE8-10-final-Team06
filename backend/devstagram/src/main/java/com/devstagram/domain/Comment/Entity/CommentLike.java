package com.devstagram.domain.Comment.Entity;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class CommentLike extends BaseEntity {

    User user;

    Comment comment;
}
