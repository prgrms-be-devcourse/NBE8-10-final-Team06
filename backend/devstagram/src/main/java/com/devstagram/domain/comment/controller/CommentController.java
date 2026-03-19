package com.devstagram.domain.comment.controller;

import java.net.URI;

import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.devstagram.domain.comment.Service.CommentService;
import com.devstagram.domain.comment.dto.CommentCreateReq;
import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.dto.CommentUpdateReq;
import com.devstagram.domain.comment.dto.ReplyInfoRes;
import com.devstagram.global.rsdata.RsData;
import com.devstagram.global.security.SecurityUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping({"posts/{postId}/comments"})
    public RsData<Slice<CommentInfoRes>> getComments(
            @PathVariable Long postId,
            @RequestParam(name = "pageNumber", defaultValue = "0") int pageNumber,
            @AuthenticationPrincipal SecurityUser securityUser) {
        Slice<CommentInfoRes> commentList = commentService.getCommentsByPostId(postId, pageNumber);

        return RsData.success("댓글 조회 성공", commentList);
    }

    @GetMapping({"/comments/{commentId}/replies"})
    public RsData<Slice<ReplyInfoRes>> getReplies(
            @PathVariable Long commentId,
            @RequestParam(name = "pageNumber", defaultValue = "0") int pageNumber,
            @AuthenticationPrincipal SecurityUser securityUser) {

        Slice<ReplyInfoRes> replyList = commentService.getRepliesByCommentId(commentId, pageNumber);

        return RsData.success("대댓글 조회 성공", replyList);
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<RsData<Long>> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateReq req,
            @AuthenticationPrincipal SecurityUser securityUser) {

        Long commentId = commentService.createComment(postId, securityUser.getId(), req);

        RsData<Long> rsData = new RsData<>("201-S-1", "댓글 작성 성공", commentId);

        return ResponseEntity.created(URI.create("/api/posts/" + postId + "/comments/" + commentId))
                .body(rsData);
    }

    @PutMapping("/comments/{commentId}")
    public RsData<Void> updateComment(
            @PathVariable("commentId") Long commentId,
            @RequestBody @Valid CommentUpdateReq req,
            @AuthenticationPrincipal SecurityUser securityUser) {
        commentService.updateComment(commentId, securityUser.getId(), req.content());

        return RsData.success();
    }

    @DeleteMapping("/comments/{commentId}")
    public RsData<Void> deleteComment(
            @PathVariable Long commentId, @AuthenticationPrincipal SecurityUser securityUser) {
        commentService.deleteComment(commentId, securityUser.getId());

        return RsData.success();
    }

    @PostMapping("/comments/{commentId}")
    public RsData<Void> toggleLike(@PathVariable Long commentId, @AuthenticationPrincipal SecurityUser securityUser) {
        boolean isLiked = commentService.toggleCommentLike(commentId, securityUser.getId());

        String message = isLiked ? "댓글 좋아요 성공" : "댓글 좋아요 취소 성공";

        return RsData.success(message, null);
    }
}
