package com.devstagram.global.Entity;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
public class BaseEntity {

    Long id;

    Date createdAt;

    Date modifiedAt;

}
