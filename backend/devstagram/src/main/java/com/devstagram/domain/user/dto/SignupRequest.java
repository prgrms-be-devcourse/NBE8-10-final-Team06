package com.devstagram.domain.user.dto;

import java.time.LocalDate;

import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Size(max = 50) String nickname,
        @NotBlank @Email @Size(max = 50) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotNull LocalDate birthDate,
        @NotNull Gender gender,
        @Size(max = 200) String githubUrl,
        @NotNull Resume resume) {
    public User toEntity(String encodedPassword) {
        User user = User.builder()
                .nickname(this.nickname)
                .email(this.email)
                .password(encodedPassword)
                .birthDate(this.birthDate)
                .gender(this.gender)
                .apiKey(java.util.UUID.randomUUID().toString())
                .build();

        UserInfo userInfo =
                UserInfo.builder().githubUrl(this.githubUrl).resume(this.resume).build();

        user.setUserInfo(userInfo);
        return user;
    }
}
