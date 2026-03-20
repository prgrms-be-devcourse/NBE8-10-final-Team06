package com.devstagram.domain.post.service;

import java.util.List;
import java.util.Optional;

import com.devstagram.domain.post.entity.PostMedia;
import com.devstagram.domain.post.repository.PostMediaRepository;
import com.devstagram.global.enumtype.MediaType;
import com.devstagram.global.storage.StorageService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.comment.constant.CommentConstants;
import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.dto.*;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.entity.PostLike;
import com.devstagram.domain.post.repository.PostLikeRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final StorageService storageService;
    private final PostMediaRepository postMediaRepository;

    @Transactional(readOnly = true)
    public Slice<PostFeedRes> getPostFeed(Pageable pageable) {

        // TODO: 피드 정책 수립 후 반영.

        return postRepository.findAllByOrderByCreatedAtDesc(pageable).map(PostFeedRes::from);
    }

    @Transactional(readOnly = true)
    public PostDetailRes getPostDetail(Long postId, int pageNumber) {
        Post post = postRepository
                .findById(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.COMMENT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, CommentConstants.DEFAULT_SORT_FIELD));

        Slice<Comment> comments = commentRepository.findCommentsWithUserAndImageByPostId(postId, pageable);

        Slice<CommentInfoRes> commentSlice = comments.map(CommentInfoRes::new);

        return PostDetailRes.from(post, commentSlice);
    }

    @Transactional
    public Long createPost(Long userId, PostCreateReq req, List<MultipartFile> files) {

        User user = userRepository.getReferenceById(userId);

        Post post = Post.builder()
                .title(req.title())
                .user(user)
                .content(req.content())
                .build();

        post = postRepository.save(post);

        //TODO: 업로드된 미디어들 처리 로직 작업중

        if (files != null && !files.isEmpty()) {
            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);

                // 로컬 디렉토리에 파일 물리적 저장 후 파일명 반환받음
                String savedFileName = storageService.store(file);

                // PostMedia 엔티티 생성 (순서 sequence 포함)
                PostMedia postMedia = PostMedia.builder()
                        .post(post)
                        .sourceUrl(savedFileName)
                        .mediaType(extractMediaType(file)) // 확장자 추출 로직
                        .sequence((short) (i + 1))
                        .build();

                postMediaRepository.save(postMedia);
            }
        }

        return post.getId();
    }

    // 파일 확장자를 보고 MediaType Enum으로 변환하는 간단한 메서드
    private MediaType extractMediaType(MultipartFile file) {
        String contentType = file.getContentType(); // 예: image/jpeg
        if (contentType == null) return MediaType.jpg;

        // 간단하게 확장자만 잘라서 MediaType과 매칭 (로직은 프로젝트에 맞게 보완 가능)
        String extension = contentType.split("/")[1].toLowerCase();
        try {
            return MediaType.valueOf(extension);
        } catch (IllegalArgumentException e) {
            return MediaType.jpg; // 기본값
        }
    }

    @Transactional
    public void updatePost(Long userId, Long postId, PostUpdateReq req) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        if (!post.getUser().getId().equals(userId)) {
            throw new ServiceException("403-U-1", "수정 권한이 없습니다.");
        }

        post.update(req.title(), req.content());
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        if (post.isDeleted()) {
            throw new ServiceException("404-P-2", "이미 삭제된 게시글입니다.");
        }

        if (!post.getUser().getId().equals(userId)) {
            throw new ServiceException("403-U-2", "삭제 권한이 없습니다.");
        }

        commentRepository.deleteRepliesByPostId(postId);
        commentRepository.deleteParentsByPostId(postId);
        // TODO: 기술태그 순차 삭제도 구현 예정

        post.softDelete();
    }

    @Transactional
    public boolean togglePostLike(Long postId, Long memberId) {

        User user = userRepository.getReferenceById(memberId);

        Post post = postRepository
                .findByIdWithLock(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, memberId);

        if (existingLike.isPresent()) {

            postLikeRepository.delete(existingLike.get());
            postRepository.decrementLikeCount(postId);
            return false;
        } else {

            PostLike newLike = PostLike.builder().user(user).post(post).build();

            postLikeRepository.save(newLike);
            postRepository.incrementLikeCount(postId);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public Slice<PostLikerRes> getPostLikers(Long postId, Pageable pageable) {

        if (!postRepository.existsById(postId)) {
            throw new ServiceException("404-P-1", "게시글이 존재하지 않습니다.");
        }

        return postLikeRepository.findLikersByPostId(postId, pageable);
    }
}
