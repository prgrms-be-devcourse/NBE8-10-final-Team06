package com.devstagram.domain.story.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import javax.annotation.processing.Generated;

import com.querydsl.core.types.Path;
import com.querydsl.core.types.PathMetadata;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QStory is a Querydsl query type for Story
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QStory extends EntityPathBase<Story> {

    private static final long serialVersionUID = 484292846L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QStory story = new QStory("story");

    public final StringPath content = createString("content");

    public final DateTimePath<java.time.LocalDateTime> createdAt =
            createDateTime("createdAt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> expiredAt =
            createDateTime("expiredAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final BooleanPath isDeleted = createBoolean("isDeleted");

    public final NumberPath<Long> likeCount = createNumber("likeCount", Long.class);

    public final QStoryMedia storyMedia;

    public final ListPath<StoryTag, QStoryTag> tags =
            this.<StoryTag, QStoryTag>createList("tags", StoryTag.class, QStoryTag.class, PathInits.DIRECT2);

    public final StringPath thumbnailUrl = createString("thumbnailUrl");

    public final com.devstagram.domain.user.entity.QUser user;

    public final ListPath<StoryViewed, QStoryViewed> viewers = this.<StoryViewed, QStoryViewed>createList(
            "viewers", StoryViewed.class, QStoryViewed.class, PathInits.DIRECT2);

    public QStory(String variable) {
        this(Story.class, forVariable(variable), INITS);
    }

    public QStory(Path<? extends Story> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QStory(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QStory(PathMetadata metadata, PathInits inits) {
        this(Story.class, metadata, inits);
    }

    public QStory(Class<? extends Story> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.storyMedia = inits.isInitialized("storyMedia") ? new QStoryMedia(forProperty("storyMedia")) : null;
        this.user = inits.isInitialized("user")
                ? new com.devstagram.domain.user.entity.QUser(forProperty("user"), inits.get("user"))
                : null;
    }
}
