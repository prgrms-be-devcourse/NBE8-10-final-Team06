package com.devstagram.domain.post.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.devstagram.domain.comment.constant.CommentConstants;
import com.devstagram.domain.comment.dto.CommentInfoRes;
import com.devstagram.domain.comment.entity.Comment;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.post.dto.*;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.entity.PostLike;
import com.devstagram.domain.post.entity.PostMedia;
import com.devstagram.domain.post.repository.PostLikeRepository;
import com.devstagram.domain.post.repository.PostMediaRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.enumtype.MediaType;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.storage.StorageService;
import com.devstagram.global.util.FileValidator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final StorageService storageService;
    private final PostMediaRepository postMediaRepository;
    private final FileValidator fileValidator;

    @Transactional(readOnly = true)
    public Slice<PostFeedRes> getPostFeed(Pageable pageable) {

        // TODO: 피드 정책 수립 후 반영.

        return postRepository.findAllByOrderByCreatedAtDesc(pageable).map(PostFeedRes::from);
    }

    @Transactional(readOnly = true)
    public PostDetailRes getPostDetail(Long postId, int pageNumber) {
        Post post = postRepository
                .findPostWithDetails(postId)
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

        if (files != null && !files.isEmpty()) {

            fileValidator.validateImages(files);

            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);

                String savedFileName = storageService.store(file);

                PostMedia postMedia = PostMedia.builder()
                        .post(post)
                        .sourceUrl(savedFileName)
                        .mediaType(extractMediaType(file))
                        .sequence((short) (i + 1))
                        .build();

                postMediaRepository.save(postMedia);
            }
        }

        return post.getId();
    }

    private MediaType extractMediaType(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();

        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename
                    .substring(originalFilename.lastIndexOf(".") + 1)
                    .toLowerCase();
        }

        return MediaType.fromString(extension);
    }

    @Transactional
    public void updatePost(Long userId, Long postId, PostUpdateReq req, List<MultipartFile> files) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        if (!post.getUser().getId().equals(userId)) {
            throw new ServiceException("403-U-1", "수정 권한이 없습니다.");
        }

        post.update(req.title(), req.content());

        if (files != null && !files.isEmpty()) {

            fileValidator.validateImages(files);

            List<String> oldFileNames =
                    post.getMediaList().stream().map(PostMedia::getSourceUrl).toList();

            post.getMediaList().clear();

            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);

                String savedFileName = storageService.store(file);

                PostMedia postMedia = PostMedia.builder()
                        .post(post)
                        .sourceUrl(savedFileName)
                        .mediaType(extractMediaType(file))
                        .sequence((short) (i + 1))
                        .build();

                post.getMediaList().add(postMedia);
            }

            oldFileNames.forEach(storageService::delete);
        }
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

        List<String> fileNames =
                post.getMediaList().stream().map(PostMedia::getSourceUrl).toList();

        post.softDelete();

        fileNames.forEach(storageService::delete);
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
