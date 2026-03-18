package com.devstagram.domain.user.entity;

import java.util.Date;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class User {
    Long id;
    String email;
    String password;
    Date birthDate;
    Gender gender;
    Date createdAt;
}
