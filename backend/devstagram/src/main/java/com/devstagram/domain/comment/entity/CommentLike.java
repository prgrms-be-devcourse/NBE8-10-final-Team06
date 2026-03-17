package com.devstagram.domain.comment.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

public class CommentLike extends BaseEntity {

    User user;

    Comment comment;
}
