package com.devstagram.domain.dm.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

public class DM extends BaseEntity {

    ChatRoom chatRoom;

    User sender;

    String content;

    boolean isRead;
}
