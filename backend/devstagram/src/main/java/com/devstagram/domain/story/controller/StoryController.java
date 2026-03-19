package com.devstagram.domain.story.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.story.dto.*;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    // 스토리 생성
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RsData<StoryCreateResponse> createStory(@ModelAttribute StoryCreateRequest request) {

        Long userId = SecurityUtil.getCurrentUserId();
        StoryCreateResponse response = storyService.createStory(userId, request);

        return RsData.success("스토리 생성 성공", response);
    }

    // 유저가 올린 활성화된 스토리 목록 가져오기
    @GetMapping("/user/{targetUserId}")
    public RsData<List<StoryDetailResponse>> getAllUserStories(@PathVariable Long targetUserId) {

        Long currentUserId = SecurityUtil.getCurrentUserId();
        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, currentUserId);

        return RsData.success("유저 스토리 목록 조회 성공", responses);
    }

    // 스토리 단건 조회 (시청 기록 저장)
    @PostMapping("/{storyId}/view")
    public RsData<StoryDetailResponse> recordStoryView(@PathVariable Long storyId) {

        Long currentUserId = SecurityUtil.getCurrentUserId();
        StoryDetailResponse response = storyService.recordSingleStoryView(storyId, currentUserId);

        return RsData.success("스토리 시청 기록 성공", response);
    }

    // 스토리 좋아요 갱신
    @PostMapping("/{storyId}/like")
    public RsData<StoryViewResponse> patchStoryLike(@PathVariable Long storyId) {

        Long userId = SecurityUtil.getCurrentUserId();
        StoryViewResponse response = storyService.patchStoryLike(storyId, userId);

        String msg = response.isLiked() ? "스토리에 좋아요" : "스토리 좋아요 취소";

        return RsData.success(msg, response);
    }

    // 스토리 수동 소프트 딜리트
    @PatchMapping("/{storyId}/soft-delete")
    public RsData<Void> softDeleteStory(@PathVariable Long storyId) {

        storyService.softDeleteStory(storyId, SecurityUtil.getCurrentUserId());

        return RsData.success("스토리 수동 소프트 딜리트 성공", null);
    }

    // 스토리 하드 딜리트
    @DeleteMapping("/{storyId}/hard-delete")
    public RsData<Void> hardDeleteStory(@PathVariable Long storyId) {

        storyService.hardDeleteStory(storyId, SecurityUtil.getCurrentUserId());
        return RsData.success("스토리 하드 딜리트 성공", null);
    }

    // 스토리 본 유저들 조회
    @GetMapping("/{storyId}/viewers")
    public RsData<List<StoryViewerUserResponse>> getStoryViewers(@PathVariable Long storyId) {

        Long currentUserId = SecurityUtil.getCurrentUserId();
        List<StoryViewerUserResponse> responses = storyService.getStoryViewers(storyId, currentUserId);

        return RsData.success("스토리 방문자 목록 조회 성공", responses);
    }

    // 스토리 좋아요 누른 유저 목록 조회
    @GetMapping("/{storyId}/likers")
    public RsData<List<StoryViewerUserResponse>> getStoryLiker(@PathVariable Long storyId) {

        Long currentUserId = SecurityUtil.getCurrentUserId();

        List<StoryViewerUserResponse> responses = storyService.getStoryLiker(storyId, currentUserId);

        return RsData.success("스토리 좋아요 누른 유저 목록 조회 성공", responses);
    }

    // 만료된 스토리 조회
    @GetMapping("/archive")
    public RsData<List<StoryDetailResponse>> getMyArchivedStories() {

        Long currentUserId = SecurityUtil.getCurrentUserId();
        List<StoryDetailResponse> responses = storyService.getMyArchivedStories(currentUserId);

        return RsData.success("만료된 스토리 목록 조회 성공", responses);
    }
}
