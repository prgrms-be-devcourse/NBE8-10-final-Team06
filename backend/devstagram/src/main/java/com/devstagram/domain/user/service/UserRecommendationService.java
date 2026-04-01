package com.devstagram.domain.user.service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.UserRecommendResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * 사용자 추천 로직을 담당하는 서비스 클래스
 * pgvector를 이용한 기술 스택 기반 유사도 추천 및 팔로워 순 인기 추천을 제공합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserRecommendationService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;

    /**
     * 추천 사용자 목록을 조회합니다.
     * @param currentUserId 현재 로그인한 사용자 ID (비로그인 시 null)
     * @return 추천 사용자 정보(DTO) 리스트
     */
    public List<UserRecommendResponse> getRecommendedUsers(Long currentUserId) {
        List<User> recommendedEntities;

        // 1. 비로그인 사용자: 전체 유저 중 팔로워가 많은 순으로 추천
        if (currentUserId == null) {
            recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                    .limit(5)
                    .toList();
        } else {
            // 2. 로그인 사용자: 기술 스택 벡터 유사도 기반 추천
            User currentUser = userRepository
                    .findById(currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

            // float[] 배열을 PostgreSQL의 vector 리터럴 형식([0.1, 0.2, ...])으로 변환
            String myVectorString = toVectorLiteral(currentUser.getTechVector());

            // 네이티브 쿼리를 호출하여 나랑 가장 유사한 기술 스택을 가진 사용자 조회
            recommendedEntities = userRepository.findRecommendedUsers(currentUserId, myVectorString, 5);

            // 3. 만약 추천 결과가 없을 경우 (예: 신규 유저): 폴백으로 인기 사용자 추천
            if (recommendedEntities.isEmpty()) {
                recommendedEntities = userRepository.findAll(Sort.by(Sort.Direction.DESC, "followerCount")).stream()
                        .filter(u -> !u.getId().equals(currentUserId)) // 본인 제외
                        .limit(5)
                        .toList();
            }
        }

        // 4. 추천된 사용자들에 대한 현재 로그인 유저의 팔로우 여부 확인
        List<Long> followingIds = (currentUserId != null)
                ? followRepository.findAllByFromUserId(currentUserId).stream()
                        .map(f -> f.getToUser().getId())
                        .toList()
                : List.of();

        // 5. 엔티티를 응답 DTO로 변환하여 반환
        return recommendedEntities.stream()
                .map(user -> UserRecommendResponse.from(user, followingIds.contains(user.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Java의 float 배열을 PostgreSQL pgvector 형식의 문자열로 변환합니다.
     * 예: [1.0, 2.0, 0.0] -> "[1.0,2.0,0.0]"
     */
    private String toVectorLiteral(float[] vector) {
        if (vector == null || vector.length == 0) {
            return "[]";
        }

        return IntStream.range(0, vector.length)
                .mapToObj(i -> Float.toString(vector[i]))
                .collect(Collectors.joining(",", "[", "]"));
    }
}
