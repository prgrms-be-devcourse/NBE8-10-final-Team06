package com.devstagram.domain.comment.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.comment.constant.CommentConstants;
import com.devstagram.domain.comment.dto.CommentCreateReq;
import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.dto.CommentLikeRes;
import com.devstagram.domain.comment.dto.ReplyInfoRes;
import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.entity.CommentLike;
import com.devstagram.domain.comment.repository.CommentLikeRepository;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Transactional
    public Long createComment(Long postId, Long memberId, CommentCreateReq req) {

        User user =
                userRepository.findById(memberId).orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 유저입니다."));

        Post post =
                postRepository.findById(postId).orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        Comment parentComment = null;

        String content = req.content();
        Long parentCommentId = req.parentCommentId();

        if (parentCommentId != null) {
            parentComment = commentRepository
                    .findById(parentCommentId)
                    .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 댓글입니다."));

            if (!parentComment.getPost().getId().equals(postId)) {
                throw new ServiceException("400-C-2", "해당 게시글의 댓글이 아닙니다.");
            }
        }

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(content)
                .parent(parentComment)
                .build();

        return commentRepository.save(comment).getId();
    }

    @Transactional(readOnly = true)
    public Slice<CommentInfoRes> getCommentsByPostId(Long memberId, Long postId, int pageNumber) {

        Post post =
                postRepository.findById(postId).orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.COMMENT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, CommentConstants.DEFAULT_SORT_FIELD));

        Slice<Comment> comments = commentRepository.findCommentsWithUserAndImageByPostId(postId, pageable);

        Set<Long> likedCommentIds = getLikedCommentIds(memberId, comments.getContent());

        // 5. DTO 변환 시 isLiked 주입 (람다 사용)
        return comments.map(
                comment -> new CommentInfoRes(comment, likedCommentIds.contains(comment.getId()), memberId));
    }

    private Set<Long> getLikedCommentIds(Long memberId, List<Comment> comments) {
        if (memberId == null || comments.isEmpty()) {
            return Collections.emptySet();
        }
        List<Long> commentIds = comments.stream().map(Comment::getId).toList();
        return commentLikeRepository.findAllCommentIdsByUserIdAndCommentIds(memberId, commentIds);
    }

    @Transactional(readOnly = true)
    public Slice<ReplyInfoRes> getRepliesByCommentId(Long memberId, Long commentId, int pageNumber) {

        Comment parent = commentRepository
                .findById(commentId)
                .orElseThrow(() -> new ServiceException("404-C-2", "존재하지 않는 댓글입니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.REPLY_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, CommentConstants.DEFAULT_SORT_FIELD));

        Slice<Comment> replies = commentRepository.findRepliesWithUserAndImageByParentId(commentId, pageable);

        Set<Long> likedCommentIds = getLikedCommentIds(memberId, replies.getContent());

        return replies.map(reply -> new ReplyInfoRes(reply, likedCommentIds.contains(reply.getId()), memberId));
    }

    @Transactional
    public void updateComment(Long commentId, Long memberId, String content) {
        Comment comment = commentRepository
                .findById(commentId)
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 댓글입니다."));

        if (!comment.getUser().getId().equals(memberId)) {
            throw new ServiceException("403-C-1", "수정 권한이 없습니다.");
        }

        comment.modify(content);
    }

    @Transactional
    public void deleteComment(Long commentId, Long memberId) {
        Comment comment = commentRepository
                .findById(commentId)
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 댓글입니다."));

        if (!comment.getUser().getId().equals(memberId)) {
            throw new ServiceException("403-C-2", "삭제 권한이 없습니다.");
        }

        if (comment.isDeleted()) {
            return;
        }

        boolean hasChildComments = commentRepository.existsByParent(comment);

        if (hasChildComments) {
            comment.softDelete();
        } else {
            commentRepository.delete(comment);
        }
    }

    @Transactional
    public CommentLikeRes toggleCommentLike(Long commentId, Long userId) {

        User user = userRepository.getReferenceById(userId);

        Comment comment = commentRepository
                .findByIdWithLock(commentId)
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 댓글입니다."));

        Optional<CommentLike> existingLike = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);

        boolean isLiked;
        if (existingLike.isPresent()) {
            commentLikeRepository.delete(existingLike.get());
            comment.removeLike();
            isLiked = false;
        } else {
            CommentLike newLike =
                    CommentLike.builder().user(user).comment(comment).build();
            commentLikeRepository.save(newLike);
            comment.addLike();
            isLiked = true;
        }

        return new CommentLikeRes(isLiked, comment.getLikeCount());
    }
}
