package com.devstagram.domain.dm.entity;

import java.util.Date;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    public static DmRoomUser create(DmRoom dmRoom, User user, Date joinedAt) {
        DmRoomUser roomUser = new DmRoomUser();
        roomUser.dmRoom = dmRoom;
        roomUser.user = user;
        roomUser.joinedAt = joinedAt;
        roomUser.lastReadMessageCursor = null;
        return roomUser;
    }

    public void markRead(Long messageId) {
        this.lastReadMessageCursor = messageId;
    }
}
