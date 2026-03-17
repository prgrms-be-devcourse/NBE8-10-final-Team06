package com.devstagram.domain.post.entity;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "MEDIUMTEXT", nullable = false)
    private String content;

    private String thumbnailUrl;

    @Column(nullable = false)
    private Long likeCount = 0L;

    @Column
    private Long commentCount = 0L;

    //    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL)
    //    private List<PostMedia> postMedia;

    //    @Column
    //    private List<Comment> comment;

    //    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL)
    //    private List<PostLike> postLikeList;

    @Builder
    public Post(String content, String title) {
        this.title = title;
        this.content = content;
        this.likeCount = 0L;
        this.commentCount = 0L;
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
