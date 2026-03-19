package com.devstagram.domain.dm.dto;

import java.util.List;

import com.devstagram.domain.user.entity.User;

public class DmRoomCreateRequest {
    List<User> users;

    String name;
}
