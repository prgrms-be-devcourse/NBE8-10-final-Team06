package com.devstagram.domain.Story.Entity;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;
import com.devstagram.global.Enum.MediaType;

import java.util.Date;
import java.util.List;

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
