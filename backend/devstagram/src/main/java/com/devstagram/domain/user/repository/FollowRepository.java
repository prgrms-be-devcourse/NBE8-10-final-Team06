package com.devstagram.domain.user.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.user.entity.Follow;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    @Query("select f from Follow f join fetch f.toUser where f.fromUser.id = :fromUserId")
    List<Follow> findAllByFromUserId(@Param("fromUserId") Long fromUserId);

    @Query("select f from Follow f join fetch f.fromUser where f.toUser.id = :toUserId")
    List<Follow> findAllByToUserId(@Param("toUserId") Long toUserId);

    // 내가 팔로우하는 사람 수 (팔로잉 카운트)
    long countByFromUserId(Long fromUserId);

    // 나를 팔로우하는 사람 수 (팔로워 카운트)
    long countByToUserId(Long toUserId);

    // 특정 팔로우 정보 가져오기 (존재 여부 확인 후 삭제 시 필요)
    Optional<Follow> findByFromUserIdAndToUserId(Long fromUserId, Long toUserId);

    // 팔로우 여부 확인용
    boolean existsByFromUserIdAndToUserId(Long fromUserId, Long toUserId);
}
