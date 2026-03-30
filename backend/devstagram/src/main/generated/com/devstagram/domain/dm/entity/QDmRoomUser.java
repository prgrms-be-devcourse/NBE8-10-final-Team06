package com.devstagram.domain.dm.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QDmRoomUser is a Querydsl query type for DmRoomUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDmRoomUser extends EntityPathBase<DmRoomUser> {

    private static final long serialVersionUID = -1732779360L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QDmRoomUser dmRoomUser = new QDmRoomUser("dmRoomUser");

    public final QDmRoom dmRoom;

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final DateTimePath<java.util.Date> joinedAt = createDateTime("joinedAt", java.util.Date.class);

    public final NumberPath<Long> lastReadMessageCursor = createNumber("lastReadMessageCursor", Long.class);

    public final com.devstagram.domain.user.entity.QUser user;

    public QDmRoomUser(String variable) {
        this(DmRoomUser.class, forVariable(variable), INITS);
    }

    public QDmRoomUser(Path<? extends DmRoomUser> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QDmRoomUser(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QDmRoomUser(PathMetadata metadata, PathInits inits) {
        this(DmRoomUser.class, metadata, inits);
    }

    public QDmRoomUser(Class<? extends DmRoomUser> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.dmRoom = inits.isInitialized("dmRoom") ? new QDmRoom(forProperty("dmRoom")) : null;
        this.user = inits.isInitialized("user") ? new com.devstagram.domain.user.entity.QUser(forProperty("user"), inits.get("user")) : null;
    }

}

