package com.devstagram.domain.story.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.story.dto.StoryCreateRequest;
import com.devstagram.domain.story.dto.StoryCreateResponse;
import com.devstagram.domain.story.dto.StoryDetailResponse;
import com.devstagram.domain.story.dto.StoryLikeResponse;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    public RsData<StoryCreateResponse> createStory(@RequestBody StoryCreateRequest request) {

        Long userId = SecurityUtil.getCurrentUserId();
        StoryCreateResponse response = storyService.createStory(userId, request);

        return RsData.success("스토리 생성 성공", response);
    }

    @GetMapping("/user/{targetUserId}")
    public RsData<List<StoryDetailResponse>> getAllUserStories(@PathVariable Long targetUserId) {

        Long currentUserId = SecurityUtil.getCurrentUserId();
        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, currentUserId);

        return RsData.success("유저 스토리 목록 조회 성공", responses);
    }

    @PostMapping("/{storyId}/like")
    public RsData<StoryLikeResponse> patchStoryLike(@PathVariable Long storyId) {

        Long userId = SecurityUtil.getCurrentUserId();
        StoryLikeResponse response = storyService.patchStoryLike(storyId, userId);

        String msg = response.isLiked() ? "스토리에 좋아요" : "스토리 좋아요 취소";

        return RsData.success(msg, response);
    }

    @PatchMapping("/{storyId}/soft-delete")
    public RsData<Void> softDeleteStory(@PathVariable Long storyId) {

        storyService.softDeleteStory(storyId, SecurityUtil.getCurrentUserId());

        return RsData.success("스토리가 소프트 딜리트 성공", null);
    }

    @DeleteMapping("/{storyId}/hard-delete")
    public RsData<Void> hardDeleteStory(@PathVariable Long storyId) {

        storyService.hardDeleteStory(storyId, SecurityUtil.getCurrentUserId());
        return RsData.success("스토리 하드 딜리트 성공", null);
    }
}
