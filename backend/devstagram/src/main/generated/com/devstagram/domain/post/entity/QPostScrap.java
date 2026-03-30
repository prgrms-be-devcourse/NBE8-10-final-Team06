package com.devstagram.domain.post.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QPostScrap is a Querydsl query type for PostScrap
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QPostScrap extends EntityPathBase<PostScrap> {

    private static final long serialVersionUID = -705069879L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QPostScrap postScrap = new QPostScrap("postScrap");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    // inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    // inherited
    public final NumberPath<Long> id = _super.id;

    // inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final QPost post;

    public final com.devstagram.domain.user.entity.QUser user;

    public QPostScrap(String variable) {
        this(PostScrap.class, forVariable(variable), INITS);
    }

    public QPostScrap(Path<? extends PostScrap> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QPostScrap(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QPostScrap(PathMetadata metadata, PathInits inits) {
        this(PostScrap.class, metadata, inits);
    }

    public QPostScrap(Class<? extends PostScrap> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.post = inits.isInitialized("post") ? new QPost(forProperty("post"), inits.get("post")) : null;
        this.user = inits.isInitialized("user")
                ? new com.devstagram.domain.user.entity.QUser(forProperty("user"), inits.get("user"))
                : null;
    }
}
