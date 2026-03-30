package com.devstagram.domain.user.controller;

import com.devstagram.domain.user.dto.UserRecommendResponse;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devstagram.domain.user.dto.UserSearchResponse;
import com.devstagram.domain.user.service.UserRecommendationService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/recommendations")
public class UserRecommendationController {

    private final UserRecommendationService userRecommendationService;

    /**
     * 기술 스택 기반 사용자 추천 목록 조회
     */
    @GetMapping
    public RsData<List<UserRecommendResponse>> getRecommendations(
            @AuthenticationPrincipal SecurityUser loginUser
    ) {
        Long currentUserId = (loginUser != null) ? loginUser.getId() : null;

        // 서비스에서 DTO 리스트를 직접 반환하도록 설계 변경
        List<UserRecommendResponse> recommendations =
                userRecommendationService.getRecommendedUsers(currentUserId);

        return RsData.success("사용자 추천 목록 조회 성공", recommendations);
    }
}