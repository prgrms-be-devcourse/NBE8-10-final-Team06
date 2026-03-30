package com.devstagram.domain.dm.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QDmRoom is a Querydsl query type for DmRoom
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDmRoom extends EntityPathBase<DmRoom> {

    private static final long serialVersionUID = -2084625099L;

    public static final QDmRoom dmRoom = new QDmRoom("dmRoom");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    // inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    // inherited
    public final NumberPath<Long> id = _super.id;

    public final BooleanPath isGroup = createBoolean("isGroup");

    // inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final StringPath name = createString("name");

    public final ListPath<DmRoomUser, QDmRoomUser> participants = this.<DmRoomUser, QDmRoomUser>createList(
            "participants", DmRoomUser.class, QDmRoomUser.class, PathInits.DIRECT2);

    public QDmRoom(String variable) {
        super(DmRoom.class, forVariable(variable));
    }

    public QDmRoom(Path<? extends DmRoom> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDmRoom(PathMetadata metadata) {
        super(DmRoom.class, metadata);
    }
}
