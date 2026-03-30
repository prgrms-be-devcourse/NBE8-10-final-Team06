package com.devstagram.domain.technology.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QTechnology is a Querydsl query type for Technology
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTechnology extends EntityPathBase<Technology> {

    private static final long serialVersionUID = -316860544L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QTechnology technology = new QTechnology("technology");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    public final QTechCategory category;

    public final StringPath color = createString("color");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    public final StringPath iconUrl = createString("iconUrl");

    //inherited
    public final NumberPath<Long> id = _super.id;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final StringPath name = createString("name");

    public QTechnology(String variable) {
        this(Technology.class, forVariable(variable), INITS);
    }

    public QTechnology(Path<? extends Technology> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QTechnology(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QTechnology(PathMetadata metadata, PathInits inits) {
        this(Technology.class, metadata, inits);
    }

    public QTechnology(Class<? extends Technology> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.category = inits.isInitialized("category") ? new QTechCategory(forProperty("category")) : null;
    }

}

