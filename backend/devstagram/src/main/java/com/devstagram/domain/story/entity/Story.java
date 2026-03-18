package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.domain.user.entity.User;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "story")
@Getter
@NoArgsConstructor
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

    private int likeCount;
    private String content;
    private String thumbnailUrl;
    private LocalDateTime expiredAt;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "story_likes",
            joinColumns = @JoinColumn(name = "story_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> likes = new ArrayList<>();

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

    public boolean patchLike(User user) {
        // 해당 유저가 좋아요 눌렀는지 여부 확인
        boolean isLiked = this.likes.stream().anyMatch(u -> u.getId().equals(user.getId()));

        if (isLiked) {
            // 좋아요 눌렀으면 -> 좋아요 취소
            this.likes.removeIf(u -> u.getId().equals(user.getId()));
            this.likeCount--;
            return false;
        } else {
            // 좋아요 안눌렀다면 -> 좋아요 추가
            this.likes.add(user);
            this.likeCount++;
            return true;
        }
    }
}
