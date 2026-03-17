package com.devstagram.global.entity;

import java.util.Date;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BaseEntity {

    Long id;

    Date createdAt;

    Date modifiedAt;
}
