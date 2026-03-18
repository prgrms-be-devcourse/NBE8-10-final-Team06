package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "story")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Story {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String content;
    private String thumbnailUrl;
    private LocalDateTime expiredAt;

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StoryLike> likes = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StoryTag> tags = new ArrayList<>();

    @Builder.Default
    private boolean isDeleted = false; // 소프트 딜리트 담당 필드

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "story_media_id")
    StoryMedia storyMedia;

    @PrePersist
    public void setExpiredAt() {
        if (this.expiredAt == null) {
            this.expiredAt = LocalDateTime.now().plusHours(24);
        }
    }

    public void checkExpired() {
        if (!this.isDeleted && LocalDateTime.now().isAfter(this.expiredAt)) {
            this.isDeleted = true;
        } // 외부에서 접근할 때마다 checkExpired로 확인 -> 만료시간 지났으면 소프트 딜리트
    }

    public void softDelete() {
        this.isDeleted = true;
    }

    public long getLikeCount() {
        return likes.size();
    }
}
