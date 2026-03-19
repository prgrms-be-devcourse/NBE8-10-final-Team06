package com.devstagram.domain.dm.entity;

import java.util.List;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DmRoom extends BaseEntity {
    private String name;

    /**
     * 단체방 여부
     */
    private Boolean isGroup;

    @OneToMany(mappedBy = "dmRoom")
    private List<DmRoomUser> participants;

    public static DmRoom create1v1Room(String name) {
        DmRoom room = new DmRoom();
        room.name = name;
        room.isGroup = false;
        return room;
    }
}
