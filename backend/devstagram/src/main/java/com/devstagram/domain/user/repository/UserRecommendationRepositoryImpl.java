package com.devstagram.domain.user.repository;

import com.devstagram.domain.technology.entity.QUserTechScore;
import com.devstagram.domain.user.entity.QFollow;
import com.devstagram.domain.user.entity.QUser;
import com.devstagram.domain.user.entity.User;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RequiredArgsConstructor
public class UserRecommendationRepositoryImpl implements UserRecommendationRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<User> findRecommendedUsers(Long currentUserId, List<Long> myTechIds, int limit) {
        QUser user = QUser.user;
        QUserTechScore userTechScore = QUserTechScore.userTechScore;
        QFollow follow = QFollow.follow;

        return queryFactory
                .selectFrom(user)
                // 1. 기술 점수 테이블과 조인
                .join(userTechScore).on(userTechScore.user.id.eq(user.id))
                .where(
                        // 2. 내가 가진 기술 ID들과 겹치는 기술을 가진 유저들
                        userTechScore.technology.id.in(myTechIds),
                        // 3. 나 자신은 제외
                        user.id.ne(currentUserId),
                        // 4. 탈퇴하지 않은 유저만
                        user.isDeleted.isFalse(),
                // 5. 내가 이미 팔로우 중인 유저 제외 (서브쿼리)
                user.id.notIn(
                        JPAExpressions
                                .select(follow.toUser.id)
                                .from(follow)
                                .where(follow.fromUser.id.eq(currentUserId))
                )
                )
        // 6. 유저별로 그룹화하여 점수 합산 준비
                .groupBy(user.id)
                // 7. 겹치는 기술들의 점수 합계가 높은 순서대로 정렬
                .orderBy(userTechScore.score.sum().desc())
                .limit(limit)
                .fetch();
    }
}