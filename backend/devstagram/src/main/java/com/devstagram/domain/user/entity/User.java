package com.devstagram.domain.user.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.devstagram.domain.post.entity.PostScrap;
import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @Column(columnDefinition = "vector(142)")
    @JdbcTypeCode(SqlTypes.VECTOR)
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

    public void updateTechScore(Long techId, float score) {
        int index = techId.intValue() - 1; // 1번 기술 -> 0번 인덱스
        if (index >= 0 && index < 142) {
            if (this.techVector == null) this.techVector = new float[142];
            this.techVector[index] += score; // 기존 점수에 누적
        }
    }
}
