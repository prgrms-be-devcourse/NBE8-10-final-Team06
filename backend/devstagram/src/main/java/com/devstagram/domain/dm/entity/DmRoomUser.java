package com.devstagram.domain.dm.entity;

import java.util.Date;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class DmRoomUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "dm_room_id", nullable = false)
    private DmRoom dmRoom;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreatedDate
    private Date joinedAt;

    /**
     * 이 유저가 이 방에서 마지막으로 읽은 메시지의 ID
     */
    private Long lastReadMessageCursor;
}
