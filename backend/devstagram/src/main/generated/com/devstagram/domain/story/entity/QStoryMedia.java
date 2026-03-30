package com.devstagram.domain.story.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QStoryMedia is a Querydsl query type for StoryMedia
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QStoryMedia extends EntityPathBase<StoryMedia> {

    private static final long serialVersionUID = -75289706L;

    public static final QStoryMedia storyMedia = new QStoryMedia("storyMedia");

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final EnumPath<com.devstagram.global.enumtype.MediaType> mediaType = createEnum("mediaType", com.devstagram.global.enumtype.MediaType.class);

    public final StringPath sourceUrl = createString("sourceUrl");

    public QStoryMedia(String variable) {
        super(StoryMedia.class, forVariable(variable));
    }

    public QStoryMedia(Path<? extends StoryMedia> path) {
        super(path.getType(), path.getMetadata());
    }

    public QStoryMedia(PathMetadata metadata) {
        super(StoryMedia.class, metadata);
    }

}

