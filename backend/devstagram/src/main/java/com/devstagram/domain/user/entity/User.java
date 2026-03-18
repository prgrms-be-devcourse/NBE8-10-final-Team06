package com.devstagram.domain.user.entity;

import java.time.LocalDate;

import com.devstagram.global.entity.BaseEntity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
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

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(unique = true)
    private String apiKey;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private UserInfo userInfo;

    public void setUserInfo(UserInfo userInfo) {
        this.userInfo = userInfo;
        if (userInfo != null) {
            userInfo.setUser(this);
        }
    }
}
