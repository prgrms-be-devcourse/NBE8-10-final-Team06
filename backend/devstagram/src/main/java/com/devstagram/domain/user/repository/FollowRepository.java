package com.devstagram.domain.user.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.devstagram.domain.user.entity.Follow;
import com.devstagram.domain.user.entity.User;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    // 이미 팔로우했는지 확인 (팔로우 버튼 상태 결정용)
    boolean existsByFromUserAndToUser(User fromUser, User toUser);

    // 팔로우 관계 삭제 (언팔로우용)
    void deleteByFromUserAndToUser(User fromUser, User toUser);

    // 내가 팔로우하는 사람 수 (팔로잉 카운트)
    long countByFromUser(User fromUser);

    // 나를 팔로우하는 사람 수 (팔로워 카운트)
    long countByToUser(User toUser);

    // 특정 팔로우 정보 가져오기 (존재 여부 확인 후 삭제 시 필요)
    Optional<Follow> findByFromUserAndToUser(User fromUser, User toUser);
}