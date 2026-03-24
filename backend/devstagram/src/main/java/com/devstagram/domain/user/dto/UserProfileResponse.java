package com.devstagram.domain.user.dto;

import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.entity.UserInfo;
import java.time.LocalDate;
import java.util.Optional;

public record UserProfileResponse(
        Long userId,
        String nickname,
        String profileImageUrl,
        LocalDate birthDate,
        Gender gender,
        String githubUrl,
        Resume resume,
        long postCount,
        long followerCount,
        long followingCount,
        boolean isFollowing
) {
    public static UserProfileResponse of(
            User user,
            long postCount,
            long followerCount,
            long followingCount,
            boolean isFollowing
    ) {
        // 실무적 포인트: Optional을 활용해 UserInfo가 null이어도 터지지 않게 보호
        UserInfo info = user.getUserInfo();

        return new UserProfileResponse(
                user.getId(),
                user.getNickname(),
                // 사진이 없으면 기본 이미지 경로를 반환하는 것이 실무적 관례
                Optional.ofNullable(user.getProfileImageUrl()).orElse("/default-profile.png"),
                user.getBirthDate(),
                user.getGender(),
                // 상세 정보가 없으면 빈 문자열("")이나 기본 Enum을 내려줌
                Optional.ofNullable(info).map(UserInfo::getGithubUrl).orElse(""),
                Optional.ofNullable(info).map(UserInfo::getResume).orElse(Resume.UNSPECIFIED),
                postCount,
                followerCount,
                followingCount,
                isFollowing
        );
    }
}