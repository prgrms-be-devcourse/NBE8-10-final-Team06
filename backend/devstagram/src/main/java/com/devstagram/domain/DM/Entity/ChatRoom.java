package com.devstagram.domain.DM.Entity;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

import java.util.List;

public class ChatRoom extends BaseEntity {
    String name;

    boolean isGroup;

    List<User> participantList;
}
