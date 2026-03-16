package com.devstagram.domain.DM.Entity;

import com.devstagram.domain.User.Entity.User;

import java.util.Date;

public class ChatParticipant {
    Long id;
    ChatRoom chatRoom;
    User user;
    Date joinedAt;
}
