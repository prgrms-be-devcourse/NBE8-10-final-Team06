package com.devstagram.domain.Story.Entity;

import java.util.Date;
import java.util.List;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class Story extends BaseEntity {
    User user;
    int like_count;
    String content;
    String thumbnailUrl;
    Date expiredAt;

    List<User> likes;

    List<User> tags;

    StoryMedia storyMedia;
}
