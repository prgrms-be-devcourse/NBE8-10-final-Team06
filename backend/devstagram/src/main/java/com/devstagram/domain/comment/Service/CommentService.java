package com.devstagram.domain.comment.Service;

import com.devstagram.domain.comment.constant.CommentConstants;
import com.devstagram.domain.comment.dto.CommentCreateReq;
import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.dto.ReplyInfoRes;
import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long createComment(Long postId, Long memberId, CommentCreateReq req){

        User user = userRepository.findById(memberId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 유저입니다."));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 게시글입니다."));

        Comment parentComment = null;

        String content = req.content();
        Long parentCommentId = req.parentCommentId();

        if(parentCommentId != null){
            parentComment = commentRepository.findById(parentCommentId)
                    .orElseThrow(() -> new ServiceException("404", "존재하지 않는 댓글입니다."));

            if (!parentComment.getPost().getId().equals(postId)) {
                throw new ServiceException("400", "해당 게시글의 댓글이 아닙니다.");
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
    public Slice<CommentInfoRes> getCommentsByPostId(Long postId, int pageNumber) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 게시글입니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.COMMENT_PAGE_SIZE,
                Sort.by(Sort.Direction.ASC, CommentConstants.DEFAULT_SORT_FIELD)
        );

        Slice<Comment> comments = commentRepository.findCommentsWithMemberAndImageByPostId(postId, pageable);

        return comments.map(CommentInfoRes::new);
    }

    @Transactional(readOnly = true)
    public Slice<ReplyInfoRes> getRepliesByCommentId(Long commentId, int pageNumber) {

        Comment parent = commentRepository.findById(commentId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 댓글입니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.REPLY_PAGE_SIZE,
                Sort.by(Sort.Direction.ASC, CommentConstants.DEFAULT_SORT_FIELD)
        );

        Slice<Comment> replies = commentRepository.findRepliesWithMemberAndImageByParentId(commentId, pageable);

        return replies.map(ReplyInfoRes::new);
    }

    @Transactional
    public void updateComment(Long commentId, Long memberId, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 게시글입니다."));

        if (!comment.getUser().getId().equals(memberId)) {
            throw new ServiceException("403", "수정 권한이 없습니다.");
        }

        comment.modify(content);
    }

    @Transactional
    public void deleteComment(Long commentId, Long memberId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ServiceException("404", "존재하지 않는 댓글입니다."));

        if (!comment.getUser().getId().equals(memberId)) {
            throw new ServiceException("403", "삭제 권한이 없습니다.");
        }

        if(comment.isDeleted()){
            return;
        }

        boolean hasChildComments = commentRepository.existsByParent(comment);

        if(hasChildComments){
            comment.softDelete();
        }else{
            commentRepository.delete(comment);
        }
    }
}
