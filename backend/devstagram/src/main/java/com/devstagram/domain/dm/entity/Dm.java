package com.devstagram.domain.dm.entity;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    /**
     * 메시지 생성용 팩토리.
     * 외부에서 임의로 setter를 호출해 엔티티 상태가 깨지는 것을 방지한다.
     */
    public static Dm create(
            DmRoom dmRoom, User sender, MessageType type, String content, String thumbnailUrl, boolean valid) {
        Dm dm = new Dm();
        dm.dmRoom = dmRoom;
        dm.sender = sender;
        dm.content = content;
        dm.type = type;
        dm.thumbnailUrl = thumbnailUrl;
        dm.valid = valid;
        return dm;
    }
}
