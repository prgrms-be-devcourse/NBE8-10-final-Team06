package com.devstagram.domain.DM.Entity;

import java.util.Date;

import com.devstagram.domain.User.Entity.User;

public class ChatParticipant {
    Long id;
    ChatRoom chatRoom;
    User user;
    Date joinedAt;
}
