package com.devstagram.domain.post.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

public class PostLike extends BaseEntity {
    User user;
    Post post;
}
