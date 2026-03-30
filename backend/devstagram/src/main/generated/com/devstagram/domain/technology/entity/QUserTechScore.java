package com.devstagram.domain.technology.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QUserTechScore is a Querydsl query type for UserTechScore
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUserTechScore extends EntityPathBase<UserTechScore> {

    private static final long serialVersionUID = 879258397L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QUserTechScore userTechScore = new QUserTechScore("userTechScore");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    public final QTechCategory category;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    //inherited
    public final NumberPath<Long> id = _super.id;

    public final NumberPath<Integer> likeCount = createNumber("likeCount", Integer.class);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final NumberPath<Integer> postCount = createNumber("postCount", Integer.class);

    public final NumberPath<Integer> score = createNumber("score", Integer.class);

    public final NumberPath<Integer> scrapCount = createNumber("scrapCount", Integer.class);

    public final QTechnology technology;

    public final com.devstagram.domain.user.entity.QUser user;

    public QUserTechScore(String variable) {
        this(UserTechScore.class, forVariable(variable), INITS);
    }

    public QUserTechScore(Path<? extends UserTechScore> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QUserTechScore(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QUserTechScore(PathMetadata metadata, PathInits inits) {
        this(UserTechScore.class, metadata, inits);
    }

    public QUserTechScore(Class<? extends UserTechScore> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.category = inits.isInitialized("category") ? new QTechCategory(forProperty("category")) : null;
        this.technology = inits.isInitialized("technology") ? new QTechnology(forProperty("technology"), inits.get("technology")) : null;
        this.user = inits.isInitialized("user") ? new com.devstagram.domain.user.entity.QUser(forProperty("user"), inits.get("user")) : null;
    }

}

