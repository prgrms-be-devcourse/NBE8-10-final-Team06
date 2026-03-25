package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "story")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Story {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime expiredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String content;
    private String thumbnailUrl;

    private long likeCount;

    @Builder.Default
    private boolean isDeleted = false; // 소프트 딜리트 담당 필드

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true) // 스토리 삭제시 자동 삭제
    @Builder.Default
    private List<StoryViewed> viewers = new ArrayList<>();

    @BatchSize(size = 100)
    @Builder.Default
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true) // 스토리 삭제시 자동 삭제
    private List<StoryTag> tags = new ArrayList<>();

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL) // 스토리 삭제시 자동 삭제
    @JoinColumn(name = "story_media_id")
    StoryMedia storyMedia;

    @PrePersist
    public void setExpiredAt() {
        if (this.expiredAt == null) {
            this.expiredAt = LocalDateTime.now().plusHours(24);
        }
    }

    public void softDelete() {
        this.isDeleted = true;
    }
}
