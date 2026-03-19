package com.devstagram.domain.user.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.entity.User;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    List<Follow> findAllByFromUser(User fromUser);
    List<Follow> findAllByToUser(User toUser);

    // 내가 팔로우하는 사람 수 (팔로잉 카운트)
    long countByFromUser(User fromUser);

    // 나를 팔로우하는 사람 수 (팔로워 카운트)
    long countByToUser(User toUser);

    // 특정 팔로우 정보 가져오기 (존재 여부 확인 후 삭제 시 필요)
    Optional<Follow> findByFromUserIdAndToUserId(Long fromUserId, Long toUserId);

    // 팔로우 여부 확인용
    boolean existsByFromUserIdAndToUserId(Long fromUserId, Long toUserId);
}