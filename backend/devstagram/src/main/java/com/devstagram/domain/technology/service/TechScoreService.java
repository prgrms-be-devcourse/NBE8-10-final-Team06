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

    // 활동별 점수 가중치 (게시=20, 좋아요=5, 스크랩= 10)
    private static final int SCORE_POST = 20;
    private static final int SCORE_LIKE = 5;
    private static final int SCORE_SCRAP = 10;

    /**
     * 특정 활동에 대한 사용자의 기술 점수를 증가시킵니다.
     * 해당 기술에 대한 점수 기록이 없는 경우 새롭게 생성합니다.
     * * @param user         점수를 획득하는 사용자
     * @param tech         점수가 부여될 기술 태그
     * @param activityType 활동 유형 ("POST", "LIKE", "SCRAP")
     */
    public void increaseScore(User user, Technology tech, String activityType) {
        UserTechScore techScore = userTechScoreRepository
                .findByUserAndTechnology(user, tech)
                .orElseGet(() -> userTechScoreRepository.save(new UserTechScore(user, tech, tech.getCategory())));

        switch (activityType) {
            case "POST" -> {
                techScore.increaseScore(SCORE_POST);
                techScore.increasePostCount();
            }
            case "LIKE" -> {
                techScore.increaseScore(SCORE_LIKE);
                techScore.increaseLikeCount();
            }
            case "SCRAP" -> {
                techScore.increaseScore(SCORE_SCRAP);
                techScore.increaseScrapCount();
            }
        }
    }

    /**
     * 특정 활동이 취소되었을 때(예: 게시글 삭제, 좋아요 취소) 점수를 차감합니다.
     * 기록이 존재하는 경우에만 차감 로직을 수행합니다.
     * * @param user         점수가 차감될 사용자
     * @param tech         대상 기술 태그
     * @param activityType 활동 유형 ("POST", "LIKE", "SCRAP")
     */
    public void decreaseScore(User user, Technology tech, String activityType) {
        userTechScoreRepository.findByUserAndTechnology(user, tech).ifPresent(techScore -> {
            switch (activityType) {
                case "POST" -> {
                    techScore.decreaseScore(SCORE_POST);
                    techScore.decreasePostCount();
                }
                case "LIKE" -> {
                    techScore.decreaseScore(SCORE_LIKE);
                    techScore.decreaseLikeCount();
                }
                case "SCRAP" -> {
                    techScore.decreaseScore(SCORE_SCRAP);
                    techScore.decreaseScrapCount();
                }
            }
        });
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
