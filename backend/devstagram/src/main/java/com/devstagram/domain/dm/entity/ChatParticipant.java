package com.devstagram.domain.dm.entity;

import java.util.Date;

import com.devstagram.domain.user.entity.User;

public class ChatParticipant {
    Long id;
    ChatRoom chatRoom;
    User user;
    Date joinedAt;
}
