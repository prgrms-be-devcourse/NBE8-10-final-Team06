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
        @NotBlank(message = "닉네임은 필수입니다.") @Size(max = 50, message = "닉네임은 50자 이하여야 합니다.") String nickname,

        @NotBlank(message = "이메일은 필수입니다.") @Email(message = "올바른 이메일 형식이 아닙니다.") @Size(max = 50, message = "이메일은 50자 이하여야 합니다.") String email,

        @NotBlank(message = "비밀번호는 필수입니다.") @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하여야 합니다.") String password,

        @NotNull(message = "생년월일은 필수입니다.") LocalDate birthDate,

        @NotNull(message = "성별은 필수입니다.") Gender gender,

        @Size(max = 200, message = "GitHub URL은 200자 이하여야 합니다.") String githubUrl,

        @NotNull Resume resume) {

    public User toEntity(String encodedPassword, String encodedApiKey) {
        User user = User.builder()
                .nickname(this.nickname)
                .email(this.email)
                .password(encodedPassword)
                .birthDate(this.birthDate)
                .gender(this.gender)
                .apiKey(encodedApiKey)
                .techVector(new float[142])
                .build();

        UserInfo userInfo =
                UserInfo.builder().githubUrl(this.githubUrl).resume(this.resume).build();

        user.setUserInfo(userInfo);
        return user;
    }
}
