package com.devstagram.domain.DM.Entity;

import java.util.List;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class ChatRoom extends BaseEntity {
    String name;

    boolean isGroup;

    List<User> participantList;
}
