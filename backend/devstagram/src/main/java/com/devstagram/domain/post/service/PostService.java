package com.devstagram.domain.post.service;

import java.util.*;
import java.util.stream.Collectors;

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
import com.devstagram.domain.comment.repository.CommentLikeRepository;
import com.devstagram.domain.comment.repository.CommentRepository;
import com.devstagram.domain.feed.service.FeedService;
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
import com.devstagram.domain.user.repository.FollowRepository;
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
    private final FeedService feedService;
    private final FollowRepository followRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Transactional(readOnly = true)
    public Slice<PostFeedRes> getPostFeed(Long memberId, Pageable pageable) {

        // 글로벌 + 개인 1대1 비율 혼합 피드
        Map<Long, Double> rankedScoreMap = feedService.getHybridFeedWithScores(memberId, pageable);

        // redis 기반 정렬된 ID 목록
        List<Long> rankedIds = new ArrayList<>(rankedScoreMap.keySet());

        if (rankedIds.isEmpty()) {
            // 데이터가 없는 경우 최신순 Fallback
            Slice<Post> posts = postRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc(pageable);
            return convertToFeedRes(posts, memberId, Collections.emptyMap());
        }

        // 뽑아낸 ID들로 게시글 인스턴스들 가져오기
        List<Post> postList = postRepository.findAllByIdInAndIsDeletedFalse(rankedIds);

        // DB에서 사라진 ID = Redis에 남은 stale 항목 → lazy cleanup
        Set<Long> fetchedIds = postList.stream().map(Post::getId).collect(Collectors.toSet());
        List<Long> staleIds =
                rankedIds.stream().filter(id -> !fetchedIds.contains(id)).toList();
        if (!staleIds.isEmpty()) {
            feedService.removeStalePostsFromFeeds(memberId, staleIds);
        }

        // Redis에 ID가 있었지만 전부 stale이었던 경우 → fallback
        if (postList.isEmpty()) {
            Slice<Post> posts = postRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc(pageable);
            return convertToFeedRes(posts, memberId, Collections.emptyMap());
        }

        // Redis가 정해준 ID 순서대로 재정렬
        Map<Long, Integer> rankIndex = new HashMap<>();
        for (int i = 0; i < rankedIds.size(); i++) {
            rankIndex.put(rankedIds.get(i), i);
        }
        postList.sort(Comparator.comparingInt(post -> rankIndex.get(post.getId())));

        // 5. Slice 객체 생성
        boolean hasNext = rankedIds.size() >= pageable.getPageSize();
        Slice<Post> posts = new SliceImpl<>(postList, pageable, hasNext);

        return convertToFeedRes(posts, memberId, rankedScoreMap);
    }

    /**
     * 피드 조회를 위한 DTO 변환 공통 로직
     */
    private Slice<PostFeedRes> convertToFeedRes(Slice<Post> posts, Long memberId, Map<Long, Double> scoreMap) {
        Set<Long> likedPostIds = getLikedPostIds(memberId, posts.getContent());
        Set<Long> scrappedPostIds = getScrappedPostIds(memberId, posts.getContent());

        return posts.map(post -> {
            double score = scoreMap.getOrDefault(post.getId(), 0.0);
            return PostFeedRes.from(
                    post, likedPostIds.contains(post.getId()), scrappedPostIds.contains(post.getId()), memberId, score);
        });
    }

    private Set<Long> getLikedPostIds(Long memberId, List<Post> posts) {
        if (memberId == null || posts.isEmpty()) {
            return Collections.emptySet();
        }

        List<Long> postIds = posts.stream().map(Post::getId).toList();
        return postLikeRepository.findAllPostIdsByUserIdAndPostIds(memberId, postIds);
    }

    private Set<Long> getScrappedPostIds(Long memberId, List<Post> posts) {
        if (memberId == null || posts.isEmpty()) {
            return Collections.emptySet();
        }

        List<Long> postIds = posts.stream().map(Post::getId).toList();
        return postScrapRepository.findAllPostIdsByUserIdAndPostIds(memberId, postIds);
    }

    @Transactional(readOnly = true)
    public PostDetailRes getPostDetail(Long memberId, Long postId, int pageNumber) {
        Post post = postRepository
                .findPost(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.COMMENT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, CommentConstants.DEFAULT_SORT_FIELD));

        Slice<Comment> comments = commentRepository.findCommentsWithUserByPostId(postId, pageable);

        Set<Long> likedCommentIds = getLikedCommentIds(memberId, comments.getContent());

        Slice<CommentInfoRes> commentSlice = comments.map(
                comment -> new CommentInfoRes(comment, likedCommentIds.contains(comment.getId()), memberId));

        boolean isLiked = (memberId != null) && postLikeRepository.existsByPostIdAndUserId(postId, memberId);

        boolean isScrapped = (memberId != null) && postScrapRepository.existsByPostIdAndUserId(postId, memberId);

        return PostDetailRes.from(post, commentSlice, isLiked, isScrapped, memberId);
    }

    private Set<Long> getLikedCommentIds(Long memberId, List<Comment> comments) {
        if (memberId == null || comments.isEmpty()) {
            return Collections.emptySet();
        }
        List<Long> commentIds = comments.stream().map(Comment::getId).toList();
        return commentLikeRepository.findAllCommentIdsByUserIdAndCommentIds(memberId, commentIds);
    }

    @Transactional
    public Long createPost(Long userId, PostCreateReq req, List<MultipartFile> files) {

        User user =
                userRepository.findById(userId).orElseThrow(() -> new ServiceException("404-U-1", "유저를 찾을 수 없습니다."));

        Post post = Post.builder()
                .title(req.title())
                .user(user)
                .content(req.content())
                .build();

        post = postRepository.save(post);

        if (req.techIds() != null && !req.techIds().isEmpty()) {
            List<Technology> techs = technologyRepository.findAllById(req.techIds());

            for (Technology tech : techs) {
                post.addTechTag(tech);
                techScoreService.increaseScore(user, tech, "POST");
            }
        }

        // 미디어 처리
        if (files != null && !files.isEmpty()) {

            fileValidator.validateImages(files);

            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);

                String fileUrl = storageService.store(file);

                PostMedia postMedia = PostMedia.builder()
                        .post(post)
                        .sourceUrl(fileUrl)
                        .mediaType(extractMediaType(file))
                        .sequence((short) (i + 1))
                        .build();

                postMediaRepository.save(postMedia);
            }
        }
        userRepository.increasePostCount(userId);

        // 사용자 공통 글로벌 피드에 등록 (좋아요)
        feedService.registerPostToGlobalFeed(post);

        // 사용자 개인 피드에 등록 (기술 태그, 팔로우) — 트랜잭션 안에서 ID 추출 후 전달
        List<Long> techIds = post.getTechTags().stream()
                .map(pt -> pt.getTechnology().getId())
                .toList();
        feedService.deliverPostToFeeds(post, techIds);

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

        // 글쓴이의 기술 태그 변경 및 점수 반영
        if (req.techIds() != null) {

            List<Technology> oldTechs = post.getTechTags().stream()
                    .map(PostTechnology::getTechnology)
                    .toList();

            List<Technology> newTechs = technologyRepository.findAllById(req.techIds());

            // 삭제된 기술들 -> 점수 차감
            oldTechs.stream()
                    .filter(old -> !newTechs.contains(old))
                    .forEach(old -> techScoreService.decreaseScore(post.getUser(), old, "POST"));

            // 새로 추가된 기술들 -> 점수 부여
            newTechs.stream()
                    .filter(newT -> !oldTechs.contains(newT))
                    .forEach(newT -> techScoreService.increaseScore(post.getUser(), newT, "POST"));

            // 엔티티 리스트 최종 교체
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

        // [최적화] User 엔티티 통째가 아니라 ID 리스트만 뽑아서 비동기로 넘깁니다.
        List<Long> targetUserIds = feedService.findTargetUsersForPost(post).stream()
                .map(User::getId)
                .toList();

        // 기술 점수 회수 (영속성 컨텍스트 활용)
        if (!post.getTechTags().isEmpty()) {
            post.getTechTags()
                    .forEach(pt -> techScoreService.decreaseScore(post.getUser(), pt.getTechnology(), "POST"));
            post.getTechTags().clear();
        }

        post.softDelete();

        userRepository.decreasePostCount(userId);

        postRepository.saveAndFlush(post);

        // Redis 정리 위임 (ID 리스트만 전달)
        feedService.removePostFromFeeds(postId, targetUserIds, userId);
    }

    @Transactional
    public boolean togglePostLike(Long postId, Long memberId) {
        User actor =
                userRepository.findById(memberId).orElseThrow(() -> new ServiceException("404-U-1", "유저를 찾을 수 없습니다."));

        // 비관적 락 등을 활용해 게시글 조회
        Post post = postRepository
                .findByIdWithLock(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new ServiceException("404-P-2", "삭제된 게시글에는 좋아요를 누를 수 없습니다.");
        }

        Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, memberId);

        if (existingLike.isPresent()) {
            // 좋아요 취소 로직
            postLikeRepository.delete(existingLike.get());
            postRepository.decrementLikeCount(postId);

            // 행위자의 기술 점수 차감
            post.getTechTags().forEach(pt -> techScoreService.decreaseScore(actor, pt.getTechnology(), "LIKE"));

            // 글로벌 피드 점수 차감
            feedService.updatePostScoreInGlobalFeed(post, false);

            return false;
        } else {
            // 좋아요 등록 로직
            PostLike newLike = PostLike.builder().user(actor).post(post).build();
            postLikeRepository.save(newLike);
            postRepository.incrementLikeCount(postId);

            // 행위자의 기술 점수 부여
            post.getTechTags().forEach(pt -> techScoreService.increaseScore(actor, pt.getTechnology(), "LIKE"));

            // 글로벌 피드 점수 증가
            feedService.updatePostScoreInGlobalFeed(post, true);
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

        User actor =
                userRepository.findById(memberId).orElseThrow(() -> new ServiceException("404-U-1", "유저를 찾을 수 없습니다."));

        Post post = postRepository
                .findByIdWithLock(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        if (post.isDeleted()) {
            throw new ServiceException("404-P-2", "삭제된 게시글은 스크랩할 수 없습니다.");
        }

        Optional<PostScrap> scrapOpt = postScrapRepository.findByUserIdAndPostId(memberId, postId);

        // 행위자의 기술 태그 점수 증감 로직
        if (scrapOpt.isPresent()) {
            postScrapRepository.deleteByUserIdAndPostId(memberId, postId);

            post.getTechTags().forEach(pt -> techScoreService.decreaseScore(actor, pt.getTechnology(), "SCRAP"));

            return false; // 스크랩 취소
        } else {
            postScrapRepository.save(PostScrap.builder().user(actor).post(post).build());

            post.getTechTags().forEach(pt -> techScoreService.increaseScore(actor, pt.getTechnology(), "SCRAP"));

            return true; // 스크랩 성공
        }
    }

    @Transactional(readOnly = true)
    public Page<PostFeedRes> getUserScrappedPosts(Long userId, Pageable pageable) {
        // 스크랩한 게시글들 조회
        Page<Post> scrappedPosts = postScrapRepository.findActivePostsByUserId(userId, pageable);

        // 피드로 보여줄 게시글 ID 목록 추출
        List<Long> postIds =
                scrappedPosts.getContent().stream().map(Post::getId).toList();

        // 내가 좋아요 누른 게시글 명단 가져오기
        Set<Long> likedPostIds = postLikeRepository.findAllPostIdsByUserIdAndPostIds(userId, postIds);

        // 내가 스크랩한 게시글 명단 가져오기
        Set<Long> scrappedPostIds = postScrapRepository.findAllPostIdsByUserIdAndPostIds(userId, postIds);

        return scrappedPosts.map(post -> PostFeedRes.from(
                post, likedPostIds.contains(post.getId()), scrappedPostIds.contains(post.getId()), userId, 0.0));
    }
}
