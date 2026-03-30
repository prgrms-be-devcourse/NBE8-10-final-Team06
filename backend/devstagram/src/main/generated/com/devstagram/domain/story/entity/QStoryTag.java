package com.devstagram.domain.story.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QStoryTag is a Querydsl query type for StoryTag
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QStoryTag extends EntityPathBase<StoryTag> {

    private static final long serialVersionUID = 773111756L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QStoryTag storyTag = new QStoryTag("storyTag");

    public final DateTimePath<java.time.LocalDateTime> createdAt =
            createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final QStory story;

    public final com.devstagram.domain.user.entity.QUser target;

    public QStoryTag(String variable) {
        this(StoryTag.class, forVariable(variable), INITS);
    }

    public QStoryTag(Path<? extends StoryTag> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QStoryTag(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QStoryTag(PathMetadata metadata, PathInits inits) {
        this(StoryTag.class, metadata, inits);
    }

    public QStoryTag(Class<? extends StoryTag> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.story = inits.isInitialized("story") ? new QStory(forProperty("story"), inits.get("story")) : null;
        this.target = inits.isInitialized("target")
                ? new com.devstagram.domain.user.entity.QUser(forProperty("target"), inits.get("target"))
                : null;
    }
}
