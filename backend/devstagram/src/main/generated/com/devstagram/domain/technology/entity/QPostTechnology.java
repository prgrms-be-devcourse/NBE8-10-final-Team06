package com.devstagram.domain.technology.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QPostTechnology is a Querydsl query type for PostTechnology
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QPostTechnology extends EntityPathBase<PostTechnology> {

    private static final long serialVersionUID = -109123008L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QPostTechnology postTechnology = new QPostTechnology("postTechnology");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    public final QTechCategory category;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    //inherited
    public final NumberPath<Long> id = _super.id;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final com.devstagram.domain.post.entity.QPost post;

    public final QTechnology technology;

    public QPostTechnology(String variable) {
        this(PostTechnology.class, forVariable(variable), INITS);
    }

    public QPostTechnology(Path<? extends PostTechnology> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QPostTechnology(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QPostTechnology(PathMetadata metadata, PathInits inits) {
        this(PostTechnology.class, metadata, inits);
    }

    public QPostTechnology(Class<? extends PostTechnology> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.category = inits.isInitialized("category") ? new QTechCategory(forProperty("category")) : null;
        this.post = inits.isInitialized("post") ? new com.devstagram.domain.post.entity.QPost(forProperty("post"), inits.get("post")) : null;
        this.technology = inits.isInitialized("technology") ? new QTechnology(forProperty("technology"), inits.get("technology")) : null;
    }

}

