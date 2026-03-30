package com.devstagram.domain.user.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.technology.repository.UserTechScoreRepository;
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
    private final UserTechScoreRepository userTechScoreRepository;
    private final FollowRepository followRepository;

    public List<UserRecommendResponse> getRecommendedUsers(Long currentUserId) {
        List<User> recommendedEntities;

        // 1. 비로그인 사용자
        if (currentUserId == null) {
            recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                    .limit(5)
                    .toList();
        } else {
            // 2. 로그인 사용자
            User currentUser = userRepository
                    .findById(currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

            List<Long> myTopTechIds = userTechScoreRepository.findAllByUserOrderByScoreDesc(currentUser).stream()
                    .limit(3)
                    .map(uts -> uts.getTechnology().getId())
                    .toList();

            if (myTopTechIds.isEmpty()) {
                recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                        .filter(u -> !u.getId().equals(currentUserId))
                        .limit(5)
                        .toList();
            } else {
                recommendedEntities = userRepository.findRecommendedUsers(currentUserId, myTopTechIds, 5);
            }
        }

        List<Long> followingIds = (currentUserId != null)
                ? followRepository.findAllByFromUserId(currentUserId).stream()
                        .map(f -> f.getToUser().getId()) // Follow 엔티티에서 상대방 ID만 추출
                        .toList()
                : List.of(); // 비로그인이면 빈 리스트

        return recommendedEntities.stream()
                .map(user -> UserRecommendResponse.from(
                        user, followingIds.contains(user.getId()) // 리스트에 ID가 있으면 true, 없으면 false
                        ))
                .collect(Collectors.toList());
    }
}
