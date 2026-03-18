package com.devstagram.domain.dm.dto;

import java.util.List;

import com.devstagram.domain.user.entity.User;

public class DmRoomResponse {

    int roomId;

    List<User> DmRoomUsers;

    String name;

    String message; // 가장 최근의 메시지
}
