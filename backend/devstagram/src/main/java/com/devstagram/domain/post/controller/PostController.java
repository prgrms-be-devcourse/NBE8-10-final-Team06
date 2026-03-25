package com.devstagram.domain.post.controller;

import java.net.URI;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.domain.post.dto.*;
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

    @PostMapping(consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<RsData<Long>> createPost(
            @AuthenticationPrincipal SecurityUser user,
            @Valid @RequestPart("request") PostCreateReq req,
            @RequestPart("files") List<MultipartFile> files) {

        Long postId = postService.createPost(user.getId(), req, files);

        RsData<Long> rsData = new RsData<>("201-S-1", "게시글 생성 성공", postId);

        return ResponseEntity.created(URI.create("/api/posts/" + postId)).body(rsData);
    }

    @PutMapping(
            value = "/{postId}",
            consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.MULTIPART_FORM_DATA_VALUE})
    public RsData<Void> updatePost(
            @AuthenticationPrincipal SecurityUser user,
            @PathVariable Long postId,
            @Valid @RequestPart("request") PostUpdateReq req,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        postService.updatePost(user.getId(), postId, req, files);

        return RsData.success();
    }

    @DeleteMapping("/{postId}")
    public RsData<Void> deletePost(@AuthenticationPrincipal SecurityUser user, @PathVariable Long postId) {
        postService.deletePost(user.getId(), postId);

        return RsData.success();
    }

    @GetMapping("/{postId}")
    public RsData<PostDetailRes> getPost(
            @PathVariable Long postId, @RequestParam(name = "pageNumber", defaultValue = "0") int pageNumber) {
        PostDetailRes postDetail = postService.getPostDetail(postId, pageNumber);

        return RsData.success("게시물 조회 성공", postDetail);
    }

    @GetMapping
    public RsData<Slice<PostFeedRes>> getPosts(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Slice<PostFeedRes> feed = postService.getPostFeed(pageable);

        return RsData.success("피드 조회 성공", feed);
    }

    @PostMapping("/{postId}/like")
    public RsData<Void> toggleLike(@PathVariable Long postId, @AuthenticationPrincipal SecurityUser securityUser) {
        boolean isLiked = postService.togglePostLike(postId, securityUser.getId());

        String message = isLiked ? "좋아요 성공" : "좋아요 취소 성공";

        return RsData.success(message, null);
    }

    @GetMapping("/{postId}/likers")
    public RsData<Slice<PostLikerRes>> getLikers(
            @PathVariable Long postId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Slice<PostLikerRes> likers = postService.getPostLikers(postId, pageable);

        return RsData.success("좋아요 목록 조회 성공", likers);
    }

    @PostMapping("/{postId}/scrap")
    public RsData<Void> toggleScrap(
            @PathVariable Long postId, @AuthenticationPrincipal SecurityUser securityUser) { // 현재 로그인 유저 정보

        boolean isScrapped = postService.toggleScrap(postId, securityUser.getId());

        String message = isScrapped ? "스크랩 성공" : "스크랩 취소 성공";

        return RsData.success(message, null);
    }

    @GetMapping("/scraps")
    public RsData<Page<PostFeedRes>> getMyScraps(
            @AuthenticationPrincipal SecurityUser securityUser, Pageable pageable) {

        Page<PostFeedRes> posts = postService.getUserScrappedPosts(securityUser.getId(), pageable);

        return RsData.success("스크랩 게시글 조회 성공", posts);
    }
}
