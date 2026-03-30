package com.devstagram.domain.post.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QPostMedia is a Querydsl query type for PostMedia
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QPostMedia extends EntityPathBase<PostMedia> {

    private static final long serialVersionUID = -710564644L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QPostMedia postMedia = new QPostMedia("postMedia");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final EnumPath<com.devstagram.global.enumtype.MediaType> mediaType = createEnum("mediaType", com.devstagram.global.enumtype.MediaType.class);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final QPost post;

    public final NumberPath<Short> sequence = createNumber("sequence", Short.class);

    public final StringPath sourceUrl = createString("sourceUrl");

    public QPostMedia(String variable) {
        this(PostMedia.class, forVariable(variable), INITS);
    }

    public QPostMedia(Path<? extends PostMedia> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QPostMedia(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QPostMedia(PathMetadata metadata, PathInits inits) {
        this(PostMedia.class, metadata, inits);
    }

    public QPostMedia(Class<? extends PostMedia> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.post = inits.isInitialized("post") ? new QPost(forProperty("post"), inits.get("post")) : null;
    }

}

