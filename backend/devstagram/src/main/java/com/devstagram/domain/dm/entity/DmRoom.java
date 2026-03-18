package com.devstagram.domain.dm.entity;

import java.util.List;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class DmRoom extends BaseEntity {
    private String name;

    /**
     * 단체방 여부
     */
    private Boolean isGroup;

    @OneToMany(mappedBy = "dmRoom")
    private List<DmRoomUser> participants;
}
