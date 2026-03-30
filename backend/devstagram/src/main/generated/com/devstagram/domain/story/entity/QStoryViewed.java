package com.devstagram.domain.story.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QStoryViewed is a Querydsl query type for StoryViewed
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QStoryViewed extends EntityPathBase<StoryViewed> {

    private static final long serialVersionUID = -2072580974L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QStoryViewed storyViewed = new QStoryViewed("storyViewed");

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final BooleanPath isLiked = createBoolean("isLiked");

    public final DateTimePath<java.time.LocalDateTime> likedAt = createDateTime("likedAt", java.time.LocalDateTime.class);

    public final QStory story;

    public final com.devstagram.domain.user.entity.QUser user;

    public final DateTimePath<java.time.LocalDateTime> viewedAt = createDateTime("viewedAt", java.time.LocalDateTime.class);

    public QStoryViewed(String variable) {
        this(StoryViewed.class, forVariable(variable), INITS);
    }

    public QStoryViewed(Path<? extends StoryViewed> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QStoryViewed(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QStoryViewed(PathMetadata metadata, PathInits inits) {
        this(StoryViewed.class, metadata, inits);
    }

    public QStoryViewed(Class<? extends StoryViewed> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.story = inits.isInitialized("story") ? new QStory(forProperty("story"), inits.get("story")) : null;
        this.user = inits.isInitialized("user") ? new com.devstagram.domain.user.entity.QUser(forProperty("user"), inits.get("user")) : null;
    }

}

