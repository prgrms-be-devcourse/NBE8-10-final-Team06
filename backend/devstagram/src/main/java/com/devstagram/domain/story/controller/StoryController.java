package com.devstagram.domain.story.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    // 스토리 생성
    @PostMapping
    public RsData<StoryCreateResponse> createStory(
            @AuthenticationPrincipal SecurityUser securityUser, @RequestBody StoryCreateRequest request) {

        StoryCreateResponse response = storyService.createStory(securityUser.getId(), request);

        return RsData.success("스토리 생성 성공", response);
    }

    // 유저가 올린 활성화된 스토리 목록 가져오기
    @GetMapping("/user/{targetUserId}")
    public RsData<List<StoryDetailResponse>> getAllUserStories(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long targetUserId) {

        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, securityUser.getId());

        return RsData.success("유저 스토리 목록 조회 성공", responses);
    }

    // 스토리 단건 조회 (시청 기록 저장)
    @PostMapping("/{storyId}/view")
    public RsData<StoryDetailResponse> recordStoryView(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        StoryDetailResponse response = storyService.recordSingleStoryView(storyId, securityUser.getId());

        return RsData.success("스토리 시청 기록 성공", response);
    }

    // 스토리 좋아요 갱신
    @PostMapping("/{storyId}/like")
    public RsData<StoryViewResponse> patchStoryLike(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        StoryViewResponse response = storyService.patchStoryLike(storyId, securityUser.getId());

        String msg = response.isLiked() ? "스토리에 좋아요" : "스토리 좋아요 취소";

        return RsData.success(msg, response);
    }

    // 스토리 수동 소프트 딜리트
    @PatchMapping("/{storyId}/soft-delete")
    public RsData<Void> softDeleteStory(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        storyService.softDeleteStory(storyId, securityUser.getId());

        return RsData.success("스토리 수동 소프트 딜리트 성공", null);
    }

    // 스토리 하드 딜리트
    @DeleteMapping("/{storyId}/hard-delete")
    public RsData<Void> hardDeleteStory(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        storyService.hardDeleteStory(storyId, securityUser.getId());
        return RsData.success("스토리 하드 딜리트 성공", null);
    }

    // 만료된 스토리 조회
    @GetMapping("/archive")
    public RsData<List<StoryDetailResponse>> getMyArchivedStories(@AuthenticationPrincipal SecurityUser securityUser) {

        Long currentUserId = securityUser.getId();
        List<StoryDetailResponse> responses = storyService.getMyArchivedStories(currentUserId);

        return RsData.success("만료된 스토리 목록 조회 성공", responses);
    }
}
