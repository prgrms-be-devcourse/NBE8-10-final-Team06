package com.devstagram.domain.user.repository;

import com.devstagram.domain.user.entity.User;
import java.util.List;

public interface UserRecommendationRepository {
    // 나를 제외하고, 내가 팔로우하지 않은 유저 중 기술 점수가 높은 유저 추천
    List<User> findRecommendedUsers(Long currentUserId, List<Long> myTechIds, int limit);
}
