package com.devstagram.domain.technology.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;

/**
 * QTechCategory is a Querydsl query type for TechCategory
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTechCategory extends EntityPathBase<TechCategory> {

    private static final long serialVersionUID = -807062744L;

    public static final QTechCategory techCategory = new QTechCategory("techCategory");

    public final com.devstagram.global.entity.QBaseEntity _super = new com.devstagram.global.entity.QBaseEntity(this);

    public final StringPath color = createString("color");

    // inherited
    public final DateTimePath<java.time.LocalDateTime> createdAt = _super.createdAt;

    // inherited
    public final NumberPath<Long> id = _super.id;

    // inherited
    public final DateTimePath<java.time.LocalDateTime> modifiedAt = _super.modifiedAt;

    public final StringPath name = createString("name");

    public QTechCategory(String variable) {
        super(TechCategory.class, forVariable(variable));
    }

    public QTechCategory(Path<? extends TechCategory> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTechCategory(PathMetadata metadata) {
        super(TechCategory.class, metadata);
    }
}
