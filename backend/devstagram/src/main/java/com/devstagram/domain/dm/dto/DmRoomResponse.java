package com.devstagram.domain.dm.dto;

import java.util.List;

import com.devstagram.domain.user.entity.User;

public record DmRoomResponse(long roomId, List<User> dmRoomUsers, String name, String message) {}
