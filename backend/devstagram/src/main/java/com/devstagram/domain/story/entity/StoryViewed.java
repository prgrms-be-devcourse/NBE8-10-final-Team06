package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
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

    public void updateLike() {
        this.isLiked = !isLiked;
        if (isLiked) {
            this.likedAt = LocalDateTime.now(); // 좋아요 시 현재 시간 갱신
            story.increaseLikeCount();
        } else {
            this.likedAt = null; // 취소 시 시간 초기화
            story.decreaseLikeCount();
        }
    }
}
