package com.devstagram.domain.technology.service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.entity.UserTechScore;
import com.devstagram.domain.technology.repository.UserTechScoreRepository;
import com.devstagram.domain.user.entity.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class TechScoreService {

    private final UserTechScoreRepository userTechScoreRepository;

    // 활동별 점수 가중치
    private static final int SCORE_POST = 20;
    private static final int SCORE_LIKE = 5;
    private static final int SCORE_SCRAP = 10;

    /**
     * 특정 활동에 대한 사용자의 기술 점수를 증가시킵니다.
     * 1) user_tech_score 테이블 갱신
     * 2) users.tech_vector 갱신
     */
    public void increaseScore(User user, Technology tech, String activityType) {
        UserTechScore techScore = userTechScoreRepository
                .findByUserAndTechnology(user, tech)
                .orElseGet(() -> userTechScoreRepository.save(new UserTechScore(user, tech, tech.getCategory())));

        switch (activityType) {
            case "POST" -> {
                techScore.increaseScore(SCORE_POST);
                techScore.increasePostCount();
                user.updateTechScore(tech.getId().intValue(), SCORE_POST);
            }
            case "LIKE" -> {
                techScore.increaseScore(SCORE_LIKE);
                techScore.increaseLikeCount();
                user.updateTechScore(tech.getId().intValue(), SCORE_LIKE);
            }
            case "SCRAP" -> {
                techScore.increaseScore(SCORE_SCRAP);
                techScore.increaseScrapCount();
                user.updateTechScore(tech.getId().intValue(), SCORE_SCRAP);
            }
            default -> {}
        }
    }

    /**
     * 특정 활동이 취소되었을 때 점수를 차감합니다.
     * 1) user_tech_score 테이블 갱신
     * 2) users.tech_vector 갱신
     */
    public void decreaseScore(User user, Technology tech, String activityType) {
        userTechScoreRepository.findByUserAndTechnology(user, tech).ifPresent(techScore -> {
            switch (activityType) {
                case "POST" -> {
                    techScore.decreaseScore(SCORE_POST);
                    techScore.decreasePostCount();
                    user.updateTechScore(tech.getId().intValue(), -SCORE_POST);
                }
                case "LIKE" -> {
                    techScore.decreaseScore(SCORE_LIKE);
                    techScore.decreaseLikeCount();
                    user.updateTechScore(tech.getId().intValue(), -SCORE_LIKE);
                }
                case "SCRAP" -> {
                    techScore.decreaseScore(SCORE_SCRAP);
                    techScore.decreaseScrapCount();
                    user.updateTechScore(tech.getId().intValue(), -SCORE_SCRAP);
                }
                default -> {}
            }
        });
    }

    /**
     * 사용자가 일정 점수 이상을 보유한 기술 ID 목록을 조회합니다.
     * 피드 배달 시 관심 기술 매칭 여부 판단용
     */
    @Transactional(readOnly = true)
    public Set<Long> getInterestedTechIds(Long userId, int minScore) {
        return userTechScoreRepository.findAllByUserIdAndScoreGreaterThanEqual(userId, minScore).stream()
                .map(uts -> uts.getTechnology().getId())
                .collect(Collectors.toSet());
    }

    /**
     * 게시글의 기술 태그들을 공통적으로 좋아하는 유저 리스트 조회
     * 용도: 게시글 작성 시 Fan-out 배달 대상 추출
     */
    @Transactional(readOnly = true)
    public List<User> findUsersByTechTags(List<PostTechnology> postTechTags) {
        if (postTechTags == null || postTechTags.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> techIds =
                postTechTags.stream().map(pt -> pt.getTechnology().getId()).toList();

        return userTechScoreRepository.findUsersByTechIdsAndScoreGreaterThanEqual(techIds, 50);
    }
}
