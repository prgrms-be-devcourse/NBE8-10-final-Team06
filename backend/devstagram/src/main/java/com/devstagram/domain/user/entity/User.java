package com.devstagram.domain.user.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.devstagram.domain.post.entity.PostScrap;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class User extends BaseEntity {

    @Column(unique = true, nullable = false, length = 50)
    private String nickname;

    @Column(unique = true, nullable = false, length = 50)
    private String email;

    @Column(length = 255)
    private String profileImageUrl;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(unique = true)
    private String apiKey;

    @Builder.Default
    @Column(nullable = false)
    private long followerCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private long followingCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private long postCount = 0;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private UserInfo userInfo;

    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostScrap> scraps = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false)
    private boolean isDeleted = false;

    private LocalDateTime deletedAt;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.VECTOR)
    @Array(length = 142)
    @Column(name = "tech_vector", columnDefinition = "vector(142)")
    private float[] techVector = new float[142];

    public void setUserInfo(UserInfo userInfo) {
        this.userInfo = userInfo;
        if (userInfo != null) {
            userInfo.setUser(this);
        }
    }

    public void updateProfile(String nickname, String profileImageUrl, LocalDate birthDate, Gender gender) {
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.birthDate = birthDate;
        this.gender = gender;
    }

    public void softDelete() {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.nickname = "탈퇴한 사용자_" + this.id;
        this.email = "deleted_" + this.id + "_" + this.email;
    }

    public void updateTechScore(int techId, float score) {
        int index = techId - 1;
        if (index >= 0 && index < this.techVector.length) {
            // 1. 값 업데이트
            float updated = this.techVector[index] + score;
            this.techVector[index] = Math.max(0, updated);

            // 2. JPA에게 배열이 통째로 바뀌었다고 새로 갈아끼워줘야 DB에 반영됩니다.
            // float[]는 객체라서 내부 값만 바꾸면 JPA가 모릅니다.
            float[] newVector = new float[this.techVector.length];
            System.arraycopy(this.techVector, 0, newVector, 0, this.techVector.length);
            this.techVector = newVector;
        }
    }
}
