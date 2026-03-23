package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@Table(name = "story_viewed", uniqueConstraints = @UniqueConstraint(columnNames = {"story_id", "user_id"}))
public class StoryViewed {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    private boolean isLiked = false; // 좋아요 여부 통합

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime viewedAt;

    private LocalDateTime likedAt;

    public void like() {
        this.isLiked = true;
        this.likedAt = LocalDateTime.now();
    }

    public void unlike() {
        this.isLiked = false;
        this.likedAt = null;
    }
}
