package com.devstagram.domain.dm.entity;

import java.util.List;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

public class ChatRoom extends BaseEntity {
    String name;

    boolean isGroup;

    List<User> participantList;
}
