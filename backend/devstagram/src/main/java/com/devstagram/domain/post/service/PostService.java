package com.devstagram.domain.post.service;

import java.util.*;

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
import com.devstagram.domain.user.entity.Follow;
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
        // 1. FeedService를 통해 Redis에서 랭킹 기반 ID 목록 확보
        List<Long> rankedIds = (memberId != null)
                ? feedService.getRankedPostIds(memberId, pageable)
                : Collections.emptyList();

        Slice<Post> posts;

        // 2. Redis에 데이터가 없거나 비로그인 유저인 경우 -> 최신순 Fallback
        if (rankedIds.isEmpty()) {
            posts = postRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            // 3. Redis ID들로 DB 조회 및 순서 유지
            List<Post> postList = postRepository.findAllByIdIn(rankedIds);

            // 중요: IN 쿼리는 순서를 보장하지 않으므로 rankedIds 순서대로 재정렬
            postList.sort(Comparator.comparingInt(post -> rankedIds.indexOf(post.getId())));

            // 4. 다음 페이지 여부 확인 (Pageable 사이즈보다 1개 더 가져왔는지 확인하는 Slice의 특성 반영)
            // 여기서는 Redis에서 정확히 가져왔으므로 간소화하거나, Redis Size와 비교 로직 필요
            boolean hasNext = rankedIds.size() >= pageable.getPageSize();
            posts = new SliceImpl<>(postList, pageable, hasNext);
        }

        // 5. 공통 로직: 좋아요 및 스크랩 여부 일괄 조회 (성능 최적화)
        Set<Long> likedPostIds = getLikedPostIds(memberId, posts.getContent());
        Set<Long> scrappedPostIds = getScrappedPostIds(memberId, posts.getContent());

        // 6. DTO 변환 및 반환
        return posts.map(post -> PostFeedRes.from(
                post,
                likedPostIds.contains(post.getId()),
                scrappedPostIds.contains(post.getId()),
                memberId));
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
                .findPostWithDetails(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "해당 게시글이 존재하지 않습니다."));

        Pageable pageable = PageRequest.of(
                pageNumber,
                CommentConstants.COMMENT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, CommentConstants.DEFAULT_SORT_FIELD));

        Slice<Comment> comments = commentRepository.findCommentsWithUserAndImageByPostId(postId, pageable);

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

                post.addTechTag(tech);

                // 글쓴이의 기술 점수 업데이트 (POST 가중치 적용)
                techScoreService.increaseScore(user, tech, "POST");
            }
        }

        // 미디어 처리
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

        // zset 점수 배달

        List<User> targetUsers = getTargetUsersForFeed(post);
        feedService.deliverPostToFeeds(post, targetUsers);

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

        commentRepository.deleteRepliesByPostId(postId);
        commentRepository.deleteParentsByPostId(postId);

        // 글쓴이의 기술 태그 점수 차감 및 매핑 제거
        if (!post.getTechTags().isEmpty()) {
            post.getTechTags()
                    .forEach(postTech ->
                            techScoreService.decreaseScore(post.getUser(), postTech.getTechnology(), "POST"));

            post.getTechTags().clear();
        }

        // 미디어 파일 삭제 준비
        List<String> fileNames =
                post.getMediaList().stream().map(PostMedia::getSourceUrl).toList();

        List<Follow> followers = followRepository.findAllByToUserId(userId);
        List<User> followerUsers = followers.stream().map(Follow::getFromUser).toList();

        post.softDelete();

        userRepository.decreasePostCount(userId);

        fileNames.forEach(storageService::delete);
        feedService.removePostFromFeeds(postId, followerUsers);
    }

    @Transactional
    public boolean togglePostLike(Long postId, Long memberId) {

        User actor = userRepository.getReferenceById(memberId);

        Post post = postRepository
                .findByIdWithLock(postId)
                .orElseThrow(() -> new ServiceException("404-P-1", "존재하지 않는 게시글입니다."));

        Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, memberId);

        List<Follow> followRelations = followRepository.findAllByToUserId(post.getUser().getId());
        List<User> followers = followRelations.stream().map(Follow::getFromUser).toList();

        // 좋아요 행위자의 기술 태그 점수 반영
        if (existingLike.isPresent()) {

            postLikeRepository.delete(existingLike.get());
            postRepository.decrementLikeCount(postId);

            // 행위자의 기술 점수 차감
            post.getTechTags()
                    .forEach(pt -> techScoreService.decreaseScore(actor, pt.getTechnology(), "LIKE"));

            // 피드 점수 실시간 차감 (비동기)
            feedService.updatePostScoreInFeeds(post, followers, false);

            return false;
        } else {

            PostLike newLike = PostLike.builder().user(actor).post(post).build();

            postLikeRepository.save(newLike);
            postRepository.incrementLikeCount(postId);

            // 행위자의 기술 점수 부여
            post.getTechTags()
                    .forEach(pt -> techScoreService.increaseScore(actor, pt.getTechnology(), "LIKE"));

            // [추가] 피드 점수 실시간 증가 (비동기)
            feedService.updatePostScoreInFeeds(post, followers, true);

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

        User actor = userRepository.getReferenceById(memberId);

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

            post.getTechTags()
                    .forEach(pt -> techScoreService.decreaseScore(actor, pt.getTechnology(), "SCRAP"));

            return false; // 스크랩 취소
        } else {
            postScrapRepository.save(PostScrap.builder().user(actor).post(post).build());

            post.getTechTags()
                    .forEach(pt -> techScoreService.increaseScore(actor, pt.getTechnology(), "SCRAP"));

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
                post, likedPostIds.contains(post.getId()), scrappedPostIds.contains(post.getId()), userId));
    }

    private List<User> getTargetUsersForFeed(Post post) {
        Long authorId = post.getUser().getId();
        List<Long> techIds = post.getTechTags().stream()
                .map(pt -> pt.getTechnology().getId())
                .toList();

        // 1. 나를 팔로우하는 유저들
        List<User> followers = followRepository.findAllByToUserId(authorId)
                .stream().map(Follow::getFromUser).toList();

        // 2. 이 기술들에 관심 있는 유저들 (예: 최소 10점 이상)
        List<User> techInterestedUsers = techIds.isEmpty() ? Collections.emptyList() :
                userRepository.findUsersByInterestedTechIds(techIds, 10.0, authorId);

        // 3. 중복 제거하여 합치기
        Set<User> allTargets = new HashSet<>(followers);
        allTargets.addAll(techInterestedUsers);

        return new ArrayList<>(allTargets);
    }
}
