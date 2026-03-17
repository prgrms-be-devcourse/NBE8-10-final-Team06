package com.devstagram.domain.story.Entity;

import java.util.Date;
import java.util.List;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

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
