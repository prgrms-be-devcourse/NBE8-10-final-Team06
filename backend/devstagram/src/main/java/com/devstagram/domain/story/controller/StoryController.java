package com.devstagram.domain.story.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.story.dto.StoryCreateRequest;
import com.devstagram.domain.story.dto.StoryCreateResponse;
import com.devstagram.domain.story.dto.StoryDetailResponse;
import com.devstagram.domain.story.dto.StoryLikeResponse;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    public RsData<StoryCreateResponse> createStory(
            @AuthenticationPrincipal SecurityUser securityUser, @RequestBody StoryCreateRequest request) {

        Long userId = securityUser.getId();
        StoryCreateResponse response = storyService.createStory(userId, request);

        return RsData.success("스토리 생성 성공", response);
    }

    @GetMapping("/user/{targetUserId}")
    public RsData<List<StoryDetailResponse>> getAllUserStories(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long targetUserId) {

        Long currentUserId = securityUser.getId();
        List<StoryDetailResponse> responses = storyService.getUserAllStories(targetUserId, currentUserId);

        return RsData.success("유저 스토리 목록 조회 성공", responses);
    }

    @PostMapping("/{storyId}/like")
    public RsData<StoryLikeResponse> patchStoryLike(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        Long userId = securityUser.getId();
        StoryLikeResponse response = storyService.patchStoryLike(storyId, userId);

        String msg = response.getIsLiked() ? "스토리에 좋아요" : "스토리 좋아요 취소";

        return RsData.success(msg, response);
    }

    @PatchMapping("/{storyId}/soft-delete")
    public RsData<Void> softDeleteStory(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        storyService.softDeleteStory(storyId, securityUser.getId());

        return RsData.success("스토리가 소프트 딜리트 성공", null);
    }

    @DeleteMapping("/{storyId}/hard-delete")
    public RsData<Void> hardDeleteStory(
            @AuthenticationPrincipal SecurityUser securityUser, @PathVariable Long storyId) {

        storyService.hardDeleteStory(storyId, securityUser.getId());
        return RsData.success("스토리 하드 딜리트 성공", null);
    }
}
