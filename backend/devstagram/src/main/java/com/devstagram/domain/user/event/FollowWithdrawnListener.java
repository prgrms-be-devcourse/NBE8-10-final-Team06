package com.devstagram.domain.user.event;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.repository.FollowRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class FollowWithdrawnListener {

    private final FollowRepository followRepository;

    @EventListener
    @Transactional
    public void handleUserWithdrawn(UserWithdrawnEvent event) {
        Long userId = event.getUserId();
        log.info("팔로우 리스너 작동: 유저 {}의 팔로우/팔로잉 데이터를 삭제합니다.", userId);

        followRepository.deleteByFromUserIdOrToUserId(userId);

        log.info("유저 {}와 관련된 모든 팔로우 관계가 하드 딜리트 되었습니다.", userId);
    }
}
