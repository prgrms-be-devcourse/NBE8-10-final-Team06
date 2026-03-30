package com.devstagram.domain.dm.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QDm is a Querydsl query type for Dm
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDm extends EntityPathBase<Dm> {

    private static final long serialVersionUID = -664969926L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QDm dm = new QDm("dm");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    public final StringPath content = createString("content");

    // inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    public final QDmRoom dmRoom;

    // inherited
    public final NumberPath<Long> id = _super.id;

    // inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final com.devstagram.domain.user.entity.QUser sender;

    public final StringPath thumbnailUrl = createString("thumbnailUrl");

    public final EnumPath<MessageType> type = createEnum("type", MessageType.class);

    public final BooleanPath valid = createBoolean("valid");

    public QDm(String variable) {
        this(Dm.class, forVariable(variable), INITS);
    }

    public QDm(Path<? extends Dm> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QDm(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QDm(PathMetadata metadata, PathInits inits) {
        this(Dm.class, metadata, inits);
    }

    public QDm(Class<? extends Dm> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.dmRoom = inits.isInitialized("dmRoom") ? new QDmRoom(forProperty("dmRoom")) : null;
        this.sender = inits.isInitialized("sender")
                ? new com.devstagram.domain.user.entity.QUser(forProperty("sender"), inits.get("sender"))
                : null;
    }
}
