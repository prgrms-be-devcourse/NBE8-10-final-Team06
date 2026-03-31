package com.devstagram.domain.post.entity;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.Technology;
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

    @Column(columnDefinition = "TEXT", nullable = false)
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

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<PostTechnology> techTags = new LinkedHashSet<>();

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC")
    private List<PostMedia> mediaList = new ArrayList<>();

    // 현재 Post에 대한 PostTechnology 생성.
    public void addTechTag(Technology technology) {
        PostTechnology postTech = PostTechnology.builder()
                .post(this)
                .technology(technology)
                .category(technology.getCategory())
                .build();

        this.techTags.add(postTech);
    }

    // 현재 Post에 대한 기존 PostTechnology 삭제 후, 새로 생성.
    public void updateTechTags(List<Technology> newTechnologies) {

        this.techTags.clear();

        newTechnologies.forEach(this::addTechTag);
    }

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
