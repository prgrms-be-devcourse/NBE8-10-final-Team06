package com.devstagram.domain.story.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.story.dto.StoryCreateRequest;
import com.devstagram.domain.story.dto.StoryCreateResponse;
import com.devstagram.domain.story.dto.StoryDetailResponse;
import com.devstagram.domain.story.service.StoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    public ResponseEntity<StoryCreateResponse> createStory(
            @AuthenticationPrincipal Long userId, @RequestBody StoryCreateRequest request) {

        StoryCreateResponse response = storyService.createStory(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/user/{targetUserId}")
    public ResponseEntity<List<StoryDetailResponse>> getAllUserStories(
            @AuthenticationPrincipal Long currentUserId, @PathVariable Long targetUserId) {

        List<StoryDetailResponse> response = storyService.getUserAllStories(targetUserId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{storyId}/soft-delete")
    public ResponseEntity<Void> softDeleteStory(@PathVariable Long storyId) {

        storyService.softDeleteStory(storyId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{storyId}/hard-delete")
    public ResponseEntity<Void> hardDeleteStory(@PathVariable Long storyId) {

        storyService.hardDeleteStory(storyId);
        return ResponseEntity.noContent().build();
    }
}
