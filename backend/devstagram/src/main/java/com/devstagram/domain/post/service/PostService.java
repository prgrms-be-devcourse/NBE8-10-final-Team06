package com.devstagram.domain.post.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.*;
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
import com.devstagram.domain.post.entity.PostScrap;
import com.devstagram.domain.post.repository.PostLikeRepository;
import com.devstagram.domain.post.repository.PostMediaRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.post.repository.PostScrapRepository;
import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.technology.service.TechScoreService;
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
    private final TechScoreService techScoreService;
    private final TechnologyRepository technologyRepository;
    private final PostScrapRepository postScrapRepository;

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

        // 기술 태그 처리
        if (req.techIds() != null && !req.techIds().isEmpty()) {
            List<Technology> techs = technologyRepository.findAllById(req.techIds());

            for (Technology tech : techs) {

                post.addTechTag(tech); // Post 엔티티 내 리스트에 추가

                // 3. 유저 기술 점수 업데이트 (POST 가중치 적용)
                techScoreService.increaseScore(user, tech, "POST");
            }
        }

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
        userRepository.increasePostCount(userId);

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

        // 2. 기술 태그 변경 및 점수 반영
        if (req.techIds() != null) {
            // [비교 로직] 기존에 등록된 기술 ID 추출
            List<Technology> oldTechs = post.getTechTags().stream()
                    .map(PostTechnology::getTechnology)
                    .toList();

            List<Technology> newTechs = technologyRepository.findAllById(req.techIds());

            // A. 삭제된 기술들 -> 점수 차감 (기존엔 있었으나 새 리스트엔 없는 것)
            oldTechs.stream()
                    .filter(old -> !newTechs.contains(old))
                    .forEach(old -> techScoreService.decreaseScore(post.getUser(), old, "POST"));

            // B. 새로 추가된 기술들 -> 점수 부여 (새 리스트엔 있으나 기존엔 없던 것)
            newTechs.stream()
                    .filter(newT -> !oldTechs.contains(newT))
                    .forEach(newT -> techScoreService.increaseScore(post.getUser(), newT, "POST"));

            // 3. 엔티티 리스트 최종 교체
            post.updateTechTags(newTechs);
        }

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

        // 기술 태그 점수 차감 및 매핑 제거
        if (!post.getTechTags().isEmpty()) {
            // 점수 서비스 호출: 게시글로 얻은 점수들 모두 회수
            post.getTechTags()
                    .forEach(postTech ->
                            techScoreService.decreaseScore(post.getUser(), postTech.getTechnology(), "POST"));

            // orphanRemoval = true 설정에 의해, 리스트를 비우면 DB의 post_technology 레코드 자동 삭제
            post.getTechTags().clear();
        }

        // 미디어 파일 삭제 준비 (스토리지 대응)
        List<String> fileNames =
                post.getMediaList().stream().map(PostMedia::getSourceUrl).toList();

        post.softDelete();

        userRepository.decreasePostCount(userId);

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

            // 기술 점수 차감
            post.getTechTags()
                    .forEach(pt -> techScoreService.decreaseScore(post.getUser(), pt.getTechnology(), "LIKE"));

            return false;
        } else {

            PostLike newLike = PostLike.builder().user(user).post(post).build();

            postLikeRepository.save(newLike);
            postRepository.incrementLikeCount(postId);

            // 기술 점수 부여
            post.getTechTags()
                    .forEach(pt -> techScoreService.increaseScore(post.getUser(), pt.getTechnology(), "LIKE"));

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

    @Transactional
    public boolean toggleScrap(Long postId, Long memberId) {

        User user = userRepository.getReferenceById(memberId);

        Post post = postRepository
                .findByIdWithLock(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new ServiceException("404-P-2", "삭제된 게시글은 스크랩할 수 없습니다.");
        }

        Optional<PostScrap> scrapOpt = postScrapRepository.findByUserIdAndPostId(memberId, postId);

        if (scrapOpt.isPresent()) {
            postScrapRepository.deleteByUserIdAndPostId(memberId, postId);

            post.getTechTags()
                    .forEach(pt -> techScoreService.decreaseScore(post.getUser(), pt.getTechnology(), "SCRAP"));

            return false; // 스크랩 취소
        } else {
            postScrapRepository.save(PostScrap.builder().user(user).post(post).build());

            post.getTechTags()
                    .forEach(pt -> techScoreService.increaseScore(post.getUser(), pt.getTechnology(), "SCRAP"));

            return true; // 스크랩 성공
        }
    }

    @Transactional(readOnly = true)
    public Page<PostFeedRes> getUserScrappedPosts(Long userId, Pageable pageable) {

        Page<Post> scrappedPosts = postScrapRepository.findActivePostsByUserId(userId, pageable);

        return scrappedPosts.map(PostFeedRes::from);
    }
}
