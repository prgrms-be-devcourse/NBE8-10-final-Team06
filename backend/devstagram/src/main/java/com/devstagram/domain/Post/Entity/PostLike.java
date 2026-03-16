package com.devstagram.domain.Post.Entity;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class PostLike extends BaseEntity {
    User user;
    Post post;
}
