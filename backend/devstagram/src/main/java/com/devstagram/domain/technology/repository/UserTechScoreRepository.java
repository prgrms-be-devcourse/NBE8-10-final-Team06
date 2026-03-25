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
}
