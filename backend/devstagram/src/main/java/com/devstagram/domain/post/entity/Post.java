package com.devstagram.domain.post.entity;

import java.util.ArrayList;
import java.util.List;

import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "MEDIUMTEXT", nullable = false)
    private String content;

    private String thumbnailUrl;

    @Builder.Default
    @Column(nullable = false)
    private Long likeCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    private Long commentCount = 0L;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    //    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL)
    //    private List<PostMedia> postMedia;

    //    @Column
    //    private List<Comment> comment;

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC")
    private List<PostMedia> mediaList = new ArrayList<>();

    @Builder
    public Post(String content, String title, User user) {
        this.user = user;
        this.title = title;
        this.content = content;
        this.likeCount = 0L;
        this.commentCount = 0L;
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void softDelete() {
        this.isDeleted = true;
    }
}
