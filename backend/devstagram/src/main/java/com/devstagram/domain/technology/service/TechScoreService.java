package com.devstagram.domain.technology.service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.UserTechScoreRepository;
import com.devstagram.domain.user.entity.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class TechScoreService {

    private final UserTechScoreRepository userTechScoreRepository;

    // 활동별 점수 가중치
    private static final float SCORE_POST = 20.0f;
    private static final float SCORE_LIKE = 5.0f;
    private static final float SCORE_SCRAP = 10.0f;

    /**
     * [벡터 방식] 특정 활동에 대한 사용자의 기술 점수를 가산합니다.
     * 이제 별도의 테이블(UserTechScore)이 아닌, User 엔티티의 142차원 techVector 배열에 직접 점수를 누적합니다.
     */
    public void increaseScore(User user, Technology tech, String activityType) {
        float score =
                switch (activityType) {
                    case "POST" -> SCORE_POST;
                    case "LIKE" -> SCORE_LIKE;
                    case "SCRAP" -> SCORE_SCRAP;
                    default -> 0.0f;
                };

        user.updateTechScore(tech.getId().intValue(), score);
    }

    /**
     * [벡터 방식] 특정 활동이 취소되었을 때 점수를 차감합니다.
     * User 엔티티의 techVector 배열에서 해당 기술 인덱스의 값을 감소시킵니다.
     */
    public void decreaseScore(User user, Technology tech, String activityType) {
        float score =
                switch (activityType) {
                    case "POST" -> -SCORE_POST;
                    case "LIKE" -> -SCORE_LIKE;
                    case "SCRAP" -> -SCORE_SCRAP;
                    default -> 0.0f;
                };

        user.updateTechScore(tech.getId().intValue(), score);
    }

    /**
     * 사용자가 일정 점수 이상을 보유한 기술 ID 목록을 조회합니다.
     * 피드 배달 시 '관심 기술 매칭' 여부를 판단하기 위해 사용됩니다.
     */
    @Transactional(readOnly = true)
    public Set<Long> getInterestedTechIds(Long userId, int minScore) {
        return userTechScoreRepository.findAllByUserIdAndScoreGreaterThanEqual(userId, minScore).stream()
                .map(uts -> uts.getTechnology().getId())
                .collect(Collectors.toSet());
    }

    /**
     * 게시글의 기술 태그들을 공통적으로 좋아하는 '유저 리스트' 조회
     * 용도: 게시글 작성 시 Fan-out 배달 대상 추출
     */
    @Transactional(readOnly = true)
    public List<User> findUsersByTechTags(List<PostTechnology> postTechTags) {
        if (postTechTags == null || postTechTags.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. PostTechnology 엔티티 리스트에서 Technology ID들만 추출
        List<Long> techIds =
                postTechTags.stream().map(pt -> pt.getTechnology().getId()).toList();

        // 2. 해당 기술 ID들 중 하나라도 '50점 이상'의 점수를 가진 유저들을 중복 없이 조회
        // (UserTechScoreRepository에 추가한 쿼리 메서드 호출)
        return userTechScoreRepository.findUsersByTechIdsAndScoreGreaterThanEqual(techIds, 50);
    }
}
