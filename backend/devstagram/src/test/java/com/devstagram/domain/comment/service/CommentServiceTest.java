package com.devstagram.domain.comment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.comment.Service.CommentService;
import com.devstagram.domain.comment.dto.CommentCreateReq;
import com.devstagram.domain.comment.dto.CommentInfoRes;
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

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @InjectMocks
    private CommentService commentService; // 구현체 클래스로 변경!

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommentLikeRepository commentLikeRepository;

    private Post createPost(Long id, String title) {
        Post post = Post.builder().title(title).build();
        ReflectionTestUtils.setField(post, "id", id);
        return post;
    }

    private Comment createComment(Long id, String content, Post post, User user, Comment parent) {
        Comment comment = Comment.builder()
                .content(content)
                .post(post)
                .user(user)
                .parent(parent)
                .build();
        ReflectionTestUtils.setField(comment, "id", id);
        return comment;
    }

    private User createMember(Long id, String nickname) {
        User member = User.builder().nickname(nickname).build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    @Test
    @DisplayName("[댓글 생성 성공]")
    void createComment_Success() {
        // [given]
        Long postId = 1L;
        Long memberId = 1L;
        CommentCreateReq req = new CommentCreateReq("댓글 내용", null);
        User user = createMember(memberId, "테스트유저");

        given(userRepository.findById(anyLong())).willReturn(Optional.of(user));
        given(postRepository.findById(postId)).willReturn(Optional.of(createPost(postId, "제목")));
        given(commentRepository.save(any(Comment.class))).willReturn(createComment(100L, "댓글 내용", null, null, null));

        // [when]
        Long resultId = commentService.createComment(postId, memberId, req);

        // [then]
        assertThat(resultId).isEqualTo(100L);
        verify(commentRepository).save(any(Comment.class));
    }

    @Test
    @DisplayName("[댓글 생성 실패]")
    void createComment_Fail_ParentNotFound() {
        // [given]
        Long postId = 1L;
        Long memberId = 1L;
        Long invalidParentId = 999L;
        CommentCreateReq req = new CommentCreateReq("내용", invalidParentId);

        User user = createMember(memberId, "테스트유저");

        given(userRepository.findById(anyLong())).willReturn(Optional.of(user));

        given(postRepository.findById(postId)).willReturn(Optional.of(createPost(postId, "제목")));
        given(commentRepository.findById(invalidParentId)).willReturn(Optional.empty());

        // [when & then]
        assertThatThrownBy(() -> commentService.createComment(postId, memberId, req))
                .isInstanceOf(ServiceException.class);
    }

    @Test
    @DisplayName("[대댓글 조회]")
    void getReplies_paging_success() {
        // [given]
        Long parentId = 1L;
        Pageable pageable = PageRequest.of(0, 5);
        Comment parent = createComment(parentId, "부모", null, null, null);
        List<Comment> replies = new ArrayList<>();

        for (long i = 1; i <= 5; i++) {
            replies.add(createComment(i + 1, "대댓글 " + i, null, createMember(i, "유저"), parent));
        }

        Slice<Comment> slice = new SliceImpl<>(replies, pageable, true);

        given(commentRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(commentRepository.findRepliesWithUserAndImageByParentId(eq(parentId), any(Pageable.class)))
                .willReturn(slice);

        // [when]
        Slice<ReplyInfoRes> result = commentService.getRepliesByCommentId(parentId, 0);

        // [then]
        assertThat(result.getContent()).hasSize(5);
        assertThat(result.hasNext()).isTrue();
    }

    @Test
    @DisplayName("[댓글 수정 성공]")
    void updateComment_Success() {
        // [Given]
        Long commentId = 1L;
        Long memberId = 1L;
        String newContent = "수정된 댓글 내용입니다.";

        User author = createMember(memberId, "작성자");
        Comment comment = createComment(commentId, "원래 내용", null, author, null);

        given(commentRepository.findById(commentId)).willReturn(Optional.of(comment));

        // [When]
        commentService.updateComment(commentId, memberId, newContent);

        // [Then]
        assertThat(comment.getContent()).isEqualTo(newContent);
    }

    @Test
    @DisplayName("[댓글 수정 실패 - 권한 없음]")
    void updateComment_Fail_Forbidden() {
        // [Given]
        Long commentId = 1L;
        Long authorId = 1L;
        Long intruderId = 999L; // 작성자가 아닌 유저
        String newContent = "해킹 시도 내용";

        User author = createMember(authorId, "작성자");
        Comment comment = createComment(commentId, "원래 내용", null, author, null);

        given(commentRepository.findById(commentId)).willReturn(Optional.of(comment));

        // [When & Then]
        assertThatThrownBy(() -> commentService.updateComment(commentId, intruderId, newContent))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("403");
    }

    @Test
    @DisplayName("[댓글 하드 삭제]")
    void deleteComment_hardDelete() {
        // [given]
        Long commentId = 1L;
        Long memberId = 1L;
        User user = createMember(memberId, "테스트유저");
        Comment comment = createComment(commentId, "내용", null, user, null);

        given(commentRepository.findById(commentId)).willReturn(Optional.of(comment));
        given(commentRepository.existsByParent(comment)).willReturn(false);

        // [when]
        commentService.deleteComment(commentId, memberId);

        // [then]
        verify(commentRepository).delete(comment);
    }

    @Test
    @DisplayName("[댓글 조회 시 게시글 없음]")
    void getComments_fail_postNotFound() {
        // [given]
        Long nonExistentPostId = 999L;
        given(postRepository.findById(nonExistentPostId)).willReturn(Optional.empty());

        // [when & then]
        assertThatThrownBy(() -> commentService.getCommentsByPostId(1L, nonExistentPostId, 0))
                .isInstanceOf(ServiceException.class);
    }

    @Test
    @DisplayName("[대댓글 삭제]")
    void getComments_FilterDeletedChildren() {
        // [Given]
        Long postId = 1L;
        Post post = createPost(postId, "제목");
        User user = createMember(1L, "작성자");
        Comment parent = createComment(1L, "부모", post, user, null);

        given(postRepository.findById(postId)).willReturn(Optional.of(post));
        given(commentRepository.findCommentsWithUserAndImageByPostId(eq(postId), any(Pageable.class)))
                .willReturn(new SliceImpl<>(List.of(parent)));

        // [When]
        Slice<CommentInfoRes> result = commentService.getCommentsByPostId(1L, postId, 0);

        // [Then]
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("[댓글 삭제 권한 실패]")
    void deleteComment_Forbidden() {
        // given
        Long postId = 1L;
        Long authorId = 100L;
        Long requesterId = 999L;
        Post post = createPost(postId, "제목");
        User user = createMember(authorId, "작성자");
        Comment comment = createComment(1L, "내용", post, user, null);

        given(commentRepository.findById(anyLong())).willReturn(Optional.of(comment));

        // when & then
        assertThatThrownBy(() -> commentService.deleteComment(1L, requesterId)).isInstanceOf(ServiceException.class);
    }

    @Test
    @DisplayName("[댓글 좋아요 성공]")
    void toggleCommentLike_CreateSuccess() {
        // [given]
        Long commentId = 1L;
        Long memberId = 1L;
        User user = createMember(memberId, "테스트유저");
        Comment comment = createComment(commentId, "댓글 내용", null, user, null);

        given(userRepository.getReferenceById(memberId)).willReturn(user);
        given(commentRepository.findByIdWithLock(commentId)).willReturn(Optional.of(comment));
        given(commentLikeRepository.findByCommentIdAndUserId(commentId, memberId))
                .willReturn(Optional.empty());

        // [when]
        boolean result = commentService.toggleCommentLike(commentId, memberId);

        // [then]
        assertThat(result).isTrue(); // 좋아요 성공 시 true 반환
        verify(commentLikeRepository, times(1)).save(any(CommentLike.class));
        verify(commentRepository, times(1)).incrementLikeCount(commentId);
    }

    @Test
    @DisplayName("[댓글 좋아요 취소 성공]")
    void toggleCommentLike_DeleteSuccess() {
        // [given]
        Long commentId = 1L;
        Long memberId = 1L;
        User user = createMember(memberId, "테스트유저");
        Comment comment = createComment(commentId, "댓글 내용", null, user, null);

        CommentLike existingLike =
                CommentLike.builder().user(user).comment(comment).build();

        given(userRepository.getReferenceById(memberId)).willReturn(user);
        given(commentRepository.findByIdWithLock(commentId)).willReturn(Optional.of(comment));
        given(commentLikeRepository.findByCommentIdAndUserId(commentId, memberId))
                .willReturn(Optional.of(existingLike));

        // [when]
        boolean result = commentService.toggleCommentLike(commentId, memberId);

        // [then]
        assertThat(result).isFalse(); // 좋아요 취소 시 false 반환
        verify(commentLikeRepository, times(1)).delete(existingLike);
        verify(commentRepository, times(1)).decrementLikeCount(commentId);
    }

    @Test
    @DisplayName("[댓글 좋아요 실패 - 존재하지 않는 댓글]")
    void toggleCommentLike_Fail_NotFound() {
        // [given]
        Long invalidCommentId = 999L;
        Long memberId = 1L;

        given(commentRepository.findByIdWithLock(invalidCommentId)).willReturn(Optional.empty());

        // [when & then]
        assertThatThrownBy(() -> commentService.toggleCommentLike(invalidCommentId, memberId))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("존재하지 않는 댓글입니다.");
        verify(commentLikeRepository, never()).save(any());
        verify(commentRepository, never()).incrementLikeCount(anyLong());
    }
}
