package com.devstagram.domain.DM.Entity;

import com.devstagram.domain.User.Entity.User;
import com.devstagram.global.Entity.BaseEntity;

public class DM extends BaseEntity {

    ChatRoom chatRoom;

    User sender;

    String content;

    boolean isRead;
}
