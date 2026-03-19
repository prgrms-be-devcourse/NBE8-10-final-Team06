package com.devstagram.domain.post.controller;

import java.net.URI;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostDetailRes;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.service.PostService;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;

    @PostMapping
    public ResponseEntity<RsData<Long>> createPost(
            @AuthenticationPrincipal SecurityUser user, @Valid @RequestBody PostCreateReq req) {

        Long postId = postService.createPost(user.getId(), req);

        RsData<Long> rsData = new RsData<>("201-S-1", "게시글 생성 성공", postId);

        return ResponseEntity.created(URI.create("/api/posts/" + postId)).body(rsData);
    }

    @PutMapping("/{postId}")
    public RsData<Void> updatePost(
            @AuthenticationPrincipal SecurityUser user,
            @PathVariable Long postId,
            @Valid @RequestBody PostUpdateReq req) {

        postService.updatePost(user.getId(), postId, req);

        return RsData.success();
    }

    @DeleteMapping("/{postId}")
    public RsData<Void> deletePost(@AuthenticationPrincipal SecurityUser user, @PathVariable Long postId) {
        postService.deletePost(user.getId(), postId);

        return RsData.success();
    }

    @GetMapping("/{postId}")
    public RsData<PostDetailRes> getPost(@PathVariable Long postId) {
        PostDetailRes postDetail = postService.getPostDetail(postId);

        return RsData.success("게시물 조회 성공", postDetail);
    }

    @GetMapping
    public RsData<Slice<PostFeedRes>> getPosts(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Slice<PostFeedRes> feed = postService.getPostFeed(pageable);

        return RsData.success("피드 조회 성공", feed);
    }
}
