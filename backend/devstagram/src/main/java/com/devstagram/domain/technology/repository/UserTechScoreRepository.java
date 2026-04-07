package com.devstagram.domain.technology.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.entity.UserTechScore;
import com.devstagram.domain.user.entity.User;

@Repository
public interface UserTechScoreRepository extends JpaRepository<UserTechScore, Long> {

    // 유저 & 기술
    Optional<UserTechScore> findByUserAndTechnology(User user, Technology technology);

    // 한 유저의 가장 높은 점수의 기술부터 내림차순: 프로필에 사용할 예정
    List<UserTechScore> findAllByUserOrderByScoreDesc(User user);

    // 유저 & 카테고리
    List<UserTechScore> findAllByUserAndCategory(User user, TechCategory category);

    // 카테고리 점수 산정: 카테고리에 속한 기술들의 점수 총합
    @Query("SELECT SUM(uts.score) FROM UserTechScore uts " + "WHERE uts.user = :user AND uts.category = :category")
    Integer sumScoreByUserAndCategory(@Param("user") User user, @Param("category") TechCategory category);

    // 특정 유저의 점수가 기준치(minScore) 이상인 모든 기술 기록 조회
    List<UserTechScore> findAllByUserIdAndScoreGreaterThanEqual(Long userId, int minScore);

    /**
     * [추가] 특정 기술들에 대해 기준 점수 이상을 가진 '유저들'을 중복 없이 조회
     */
    @Query("SELECT DISTINCT uts.user FROM UserTechScore uts "
            + "WHERE uts.technology.id IN :techIds AND uts.score >= :minScore")
    List<User> findUsersByTechIdsAndScoreGreaterThanEqual(
            @Param("techIds") List<Long> techIds, @Param("minScore") int minScore);

    /**
     * 특정 기술들에 대해 기준 점수 이상인 UserTechScore 전체 조회
     * 용도: userId → 매칭된 techId Set 맵 빌드
     */
    @Query("SELECT uts FROM UserTechScore uts " + "WHERE uts.technology.id IN :techIds AND uts.score >= :minScore")
    List<UserTechScore> findAllByTechIdsAndScoreGreaterThanEqual(
            @Param("techIds") List<Long> techIds, @Param("minScore") int minScore);
}
