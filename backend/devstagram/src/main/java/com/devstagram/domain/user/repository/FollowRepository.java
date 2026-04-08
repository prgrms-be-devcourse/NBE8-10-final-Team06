package com.devstagram.domain.user.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devstagram.domain.user.entity.Follow;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    @Query("select f from Follow f join fetch f.toUser where f.fromUser.id = :fromUserId")
    List<Follow> findAllByFromUserId(@Param("fromUserId") Long fromUserId);

    @Query("select f from Follow f join fetch f.fromUser where f.toUser.id = :toUserId")
    List<Follow> findAllByToUserId(@Param("toUserId") Long toUserId);

    @Modifying
    @Query("DELETE FROM Follow f WHERE f.fromUser.id = :userId OR f.toUser.id = :userId")
    void deleteByFromUserIdOrToUserId(@Param("userId") Long userId);

    // 내가 팔로우하는 사람 수 (팔로잉 카운트)
    long countByFromUserId(Long fromUserId);

    // 나를 팔로우하는 사람 수 (팔로워 카운트)
    long countByToUserId(Long toUserId);

    // 특정 팔로우 정보 가져오기 (존재 여부 확인 후 삭제 시 필요)
    // 명시 JPQL: 파생 메서드명(fromUserId)이 환경에 따라 잘못 해석되는 경우 방지
    @Query("select f from Follow f where f.fromUser.id = :fromUserId and f.toUser.id = :toUserId")
    Optional<Follow> findByFromUserIdAndToUserId(
            @Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    /**
     * 중복 데이터가 존재해도 해당 간선을 모두 제거한다.
     * 반환값: 실제 삭제된 row 수.
     */
    @Modifying
    @Query("delete from Follow f where f.fromUser.id = :fromUserId and f.toUser.id = :toUserId")
    int deleteAllByFromUserIdAndToUserId(
            @Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    // 팔로우 여부 확인용
    @Query("select case when count(f) > 0 then true else false end from Follow f where f.fromUser.id = :fromUserId and f.toUser.id = :toUserId")
    boolean existsByFromUserIdAndToUserId(
            @Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
