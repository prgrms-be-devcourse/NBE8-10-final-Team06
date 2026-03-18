package com.devstagram.domain.dm.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Dm extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dm_room_id", nullable = false)
    private DmRoom dmRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType type;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    /**
     * POST / STORY 의 원본이 삭제되었거나 만료되었는지 여부.
     * TEXT / IMAGE 인 경우 항상 true 로 간주한다.
     */
    @Column(nullable = false)
    private boolean valid = true;
}
