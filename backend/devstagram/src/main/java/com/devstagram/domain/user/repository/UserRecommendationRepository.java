package com.devstagram.domain.user.repository;

import java.util.List;

import com.devstagram.domain.user.entity.User;

public interface UserRecommendationRepository {
    List<User> findRecommendedUsers(Long currentUserId, String targetVector, int limit);
}
