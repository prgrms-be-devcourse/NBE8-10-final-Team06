package com.devstagram.domain.user.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;

import com.devstagram.domain.user.entity.User;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class UserRecommendationRepositoryImpl implements UserRecommendationRepository {

    private final EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<User> findRecommendedUsers(Long currentUserId, String targetVector, int limit) {
        //  142차원 벡터 공간에서 나랑 가장 가까운 유저를 찾는 쿼리
        // 1. 나 제외, 2. 탈퇴자 제외, 3. 팔로우 중인 사람 제외, 4. 코사인 유사도 정렬
        String sql = """
            SELECT u.* FROM users u
            WHERE u.id != :currentUserId
              AND u.is_deleted = false
              AND u.id NOT IN (
                  SELECT f.to_user_id FROM follow f WHERE f.from_user_id = :currentUserId
              )
            ORDER BY u.tech_vector <=> CAST(:targetVector AS vector) ASC
            LIMIT :limit
            """;

        Query query = entityManager.createNativeQuery(sql, User.class)
                .setParameter("currentUserId", currentUserId)
                .setParameter("targetVector", targetVector)
                .setParameter("limit", limit);

        return query.getResultList();
    }
}
