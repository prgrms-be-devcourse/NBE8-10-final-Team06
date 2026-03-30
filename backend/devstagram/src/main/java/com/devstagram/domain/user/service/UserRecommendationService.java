package com.devstagram.domain.user.service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.UserRecommendResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserRecommendationService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;

    public List<UserRecommendResponse> getRecommendedUsers(Long currentUserId) {
        List<User> recommendedEntities;

        // 1. 비로그인 사용자: 기존처럼 팔로워 순 추천 (벡터가 없으므로)
        if (currentUserId == null) {
            recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                    .limit(5)
                    .toList();
        } else {
            // 2. 로그인 사용자
            User currentUser = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

            // 내 142차원 벡터(float[])를 DB가 인식하는 문자열 "[0.0, 1.2, ...]"로 변환
            String myVectorString = java.util.Arrays.toString(currentUser.getTechVector());

            //  기존의 상위 기술 3개 추출 로직 삭제 -> 벡터 유사도 쿼리 호출!
            // UserRepositoryImpl에 우리가 만든 그 Native Query가 실행됩니다.
            recommendedEntities = userRepository.findRecommendedUsers(currentUserId, myVectorString, 5);

            // 데이터가 아예 없는 신규 유저일 경우 Fallback (팔로워 순)
            if (recommendedEntities.isEmpty()) {
                recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                        .filter(u -> !u.getId().equals(currentUserId))
                        .limit(5)
                        .toList();
            }
        }

        // 팔로우 여부 체크
        List<Long> followingIds = (currentUserId != null)
                ? followRepository.findAllByFromUserId(currentUserId).stream()
                .map(f -> f.getToUser().getId())
                .toList()
                : List.of();

        return recommendedEntities.stream()
                .map(user -> UserRecommendResponse.from(user, followingIds.contains(user.getId())))
                .collect(Collectors.toList());
    }
}