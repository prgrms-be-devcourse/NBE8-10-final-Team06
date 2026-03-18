package com.devstagram.domain.comment.entity;

import org.hibernate.annotations.Formula;

import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.user.entity.User;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Entity
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Comment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    Post post;

    @Column(nullable = false, length = 1000)
    String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @Column(nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    public void modify(String content) {
        this.content = content;
    }

    public void softDelete() {
        this.isDeleted = true;
        this.content = "[삭제된 댓글입니다.]";
    }

    @Formula("(SELECT count(*) FROM comment c WHERE c.parent_id = id AND c.deleted = false)")
    private long replyCount;
}
