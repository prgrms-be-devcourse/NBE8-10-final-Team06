package com.devstagram.global.initData;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.devstagram.domain.comment.dto.CommentCreateReq;
import com.devstagram.domain.comment.service.CommentService;
import com.devstagram.domain.dm.entity.Dm;
import com.devstagram.domain.dm.entity.DmRoom;
import com.devstagram.domain.dm.entity.DmRoomUser;
import com.devstagram.domain.dm.entity.MessageType;
import com.devstagram.domain.dm.repository.DmRepository;
import com.devstagram.domain.dm.repository.DmRoomRepository;
import com.devstagram.domain.dm.repository.DmRoomUserRepository;
import com.devstagram.domain.feed.service.FeedService;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.entity.PostMedia;
import com.devstagram.domain.post.repository.PostMediaRepository;
import com.devstagram.domain.post.repository.PostRepository;
import com.devstagram.domain.post.service.PostService;
import com.devstagram.domain.story.entity.Story;
import com.devstagram.domain.story.entity.StoryMedia;
import com.devstagram.domain.story.entity.StoryTag;
import com.devstagram.domain.story.repository.StoryRepository;
import com.devstagram.domain.story.repository.StoryTagRepository;
import com.devstagram.domain.story.service.StoryService;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.entity.UserTechScore;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.technology.repository.UserTechScoreRepository;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.AuthService;
import com.devstagram.domain.user.service.FollowService;
import com.devstagram.global.enumtype.MediaType;

import lombok.RequiredArgsConstructor;

@Configuration
@Profile({"dev", "local"})
@RequiredArgsConstructor
public class BaseInitData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BaseInitData.class);

    private static final int MIN_SEED_TECH_ROWS = 50;
    private static final String DEMO_PASSWORD = "password123";
    private static final String ADMIN_EMAIL = "admin@test.com";
    private static final String ADMIN_TEXT_ONLY_POST_TITLE = "이미지 없는 공지·토론용 데모 글";

    // ──────────────────────────────────────────────
    // 유저 정의
    // ──────────────────────────────────────────────
    private static final List<DemoAccountRow> DEMO_SIGNUPS = List.of(
            // 피드 시나리오별 역할이 구분되도록 설계
            new DemoAccountRow("admin", ADMIN_EMAIL, Resume.SENIOR), // Java/Spring 전문가
            new DemoAccountRow(
                    "java_expert", "java_expert@test.com", Resume.SENIOR), // Java/Spring 고득점 (팔로우 없음) → 기술태그만으로 피드 수신
            new DemoAccountRow("react_expert", "react_expert@test.com", Resume.INTERMEDIATE), // React/TS 고득점 (팔로우 없음)
            new DemoAccountRow("devops_user", "devops_user@test.com", Resume.INTERMEDIATE), // Docker/K8s 고득점
            new DemoAccountRow(
                    "follower_only", "follower_only@test.com", Resume.JUNIOR), // 기술점수 없음, admin 팔로우만 → 팔로우 피드 검증
            new DemoAccountRow(
                    "both_match", "both_match@test.com", Resume.SENIOR), // Java 고득점 + admin 팔로우 → 팔로우+기술 동시 보너스
            new DemoAccountRow("threshold_50", "threshold_50@test.com", Resume.JUNIOR), // Java 정확히 50점 → 임계값 경계 통과 검증
            new DemoAccountRow("threshold_49", "threshold_49@test.com", Resume.JUNIOR), // Java 정확히 49점 → 임계값 경계 미달 검증
            new DemoAccountRow("new_user", "new_user@test.com", Resume.UNDERGRADUATE), // 팔로우도 기술점수도 없음 → 글로벌 피드만 조회
            new DemoAccountRow("popular_poster", "popular_poster@test.com", Resume.INTERMEDIATE), // 좋아요 많이 받는 게시글 작성자
            new DemoAccountRow("low_score_user", "low_score_user@test.com", Resume.JUNIOR), // 기술점수 존재하지만 전부 50 미만
            new DemoAccountRow("search_target_kim", "search_target_kim@test.com", Resume.JUNIOR) // 검색 테스트용
            );

    // ──────────────────────────────────────────────
    // 기술 점수 (명시적·재현 가능)
    // 피드 배달 임계값: 50점 이상
    // ──────────────────────────────────────────────
    private static final List<UserTechScoreRow> TECH_SCORE_ROWS = List.of(
            // admin: Java/Spring 백엔드 전문가
            new UserTechScoreRow(ADMIN_EMAIL, "Java", 90),
            new UserTechScoreRow(ADMIN_EMAIL, "Spring Boot", 85),
            new UserTechScoreRow(ADMIN_EMAIL, "PostgreSQL", 70),
            new UserTechScoreRow(ADMIN_EMAIL, "Redis", 60),

            // java_expert: Java/Spring 고득점 (팔로우 없음 → 기술 매칭만으로 피드 수신)
            new UserTechScoreRow("java_expert@test.com", "Java", 95),
            new UserTechScoreRow("java_expert@test.com", "Spring Boot", 80),
            new UserTechScoreRow("java_expert@test.com", "PostgreSQL", 65),

            // react_expert: 프론트엔드 전문가
            new UserTechScoreRow("react_expert@test.com", "React", 90),
            new UserTechScoreRow("react_expert@test.com", "TypeScript", 80),
            new UserTechScoreRow("react_expert@test.com", "Node.js", 55),

            // devops_user: DevOps 전문가
            new UserTechScoreRow("devops_user@test.com", "Docker", 95),
            new UserTechScoreRow("devops_user@test.com", "Kubernetes", 85),
            new UserTechScoreRow("devops_user@test.com", "Amazon Web Services (AWS)", 75),

            // follower_only: 기술 점수 없음 → 팔로우 피드만 수신
            // (점수 없음)

            // both_match: Java 고득점 + admin 팔로우 → 팔로우+기술 동시 보너스 (최고 점수)
            new UserTechScoreRow("both_match@test.com", "Java", 80),
            new UserTechScoreRow("both_match@test.com", "Spring Boot", 70),

            // threshold_50: Java 정확히 50점 → 임계값 통과
            new UserTechScoreRow("threshold_50@test.com", "Java", 50),

            // threshold_49: Java 정확히 49점 → 임계값 미달
            new UserTechScoreRow("threshold_49@test.com", "Java", 49),

            // new_user: 점수 없음, 팔로우 없음 → 글로벌 피드만

            // popular_poster: 다양한 기술에 관심
            new UserTechScoreRow("popular_poster@test.com", "Java", 60),
            new UserTechScoreRow("popular_poster@test.com", "Docker", 55),

            // low_score_user: 전부 50 미만 → 개인 피드 배달 대상 아님
            new UserTechScoreRow("low_score_user@test.com", "Java", 30),
            new UserTechScoreRow("low_score_user@test.com", "React", 20),
            new UserTechScoreRow("low_score_user@test.com", "Docker", 45),

            // search_target_kim
            new UserTechScoreRow("search_target_kim@test.com", "Java", 55),
            new UserTechScoreRow("search_target_kim@test.com", "Spring Boot", 50));

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
    private final StoryRepository storyRepository;
    private final StoryTagRepository storyTagRepository;
    private final FollowService followService;
    private final PostService postService;
    private final CommentService commentService;
    private final DmRoomRepository dmRoomRepository;
    private final DmRoomUserRepository dmRoomUserRepository;
    private final DmRepository dmRepository;
    private final TechnologyRepository technologyRepository;
    private final UserTechScoreRepository userTechScoreRepository;
    private final FeedService feedService;
    private final StoryService storyService;

    private record DemoAccountRow(String nickname, String email, Resume resume) {}

    private record UserTechScoreRow(String email, String techName, int score) {}

    @Override
    // @Transactional
    public void run(ApplicationArguments args) {
        if (shouldSkip()) return;
        loadDemoDataset();
    }

    private boolean shouldSkip() {
        if (userRepository.findByEmailAndIsDeletedFalse(ADMIN_EMAIL).isPresent()) {
            return true;
        }
        //        if (technologyRepository.count() < MIN_SEED_TECH_ROWS) {
        //            log.warn(
        //                    "BaseInitData 건너뜀: technology 행이 {}개 미만입니다. Docker Postgres 초기화 시
        // infra/init-data/insert_tech.sql 시드를 확인하세요.",
        //                    MIN_SEED_TECH_ROWS);
        //            return true;
        //        }
        return false;
    }

    private void loadDemoDataset() {
        List<User> users = createUsers();
        createTechScores();
        createFollowGraph();
        List<Post> posts = createPosts(users);
        createStories(users);
        createAdminStoryForHardDeleteDemo(userByEmail(ADMIN_EMAIL));
        createPostInteractions(users, posts);
        createStoryInteractions(users);
        createArchivedStoryForAdmin(userByEmail(ADMIN_EMAIL));
        createDmRoomsAndMessages(posts);
    }

    // ──────────────────────────────────────────────
    // 유저 생성
    // ──────────────────────────────────────────────
    private List<User> createUsers() {
        for (int i = 0; i < DEMO_SIGNUPS.size(); i++) {
            DemoAccountRow row = DEMO_SIGNUPS.get(i);
            authService.signup(new SignupRequest(
                    row.nickname(),
                    row.email(),
                    DEMO_PASSWORD,
                    LocalDate.of(1990 + (i % 10), (i % 12) + 1, (i % 28) + 1),
                    i % 2 == 0 ? Gender.MALE : Gender.FEMALE,
                    "https://github.com/" + row.nickname(),
                    row.resume()));
        }
        return userRepository.findAll();
    }

    // ──────────────────────────────────────────────
    // 기술 점수 (명시적 수치 → 재현 가능)
    // ──────────────────────────────────────────────
    private void createTechScores() {
        for (UserTechScoreRow row : TECH_SCORE_ROWS) {
            User user = userByEmail(row.email());
            Technology tech = requireSeededTechnology(row.techName());
            UserTechScore score = new UserTechScore(user, tech, tech.getCategory());
            score.increaseScore(row.score());
            userTechScoreRepository.save(score);
        }
    }

    // ──────────────────────────────────────────────
    // 팔로우 관계
    // 시나리오:
    //   follower_only → admin 팔로우만 (기술 점수 없음)
    //   both_match    → admin 팔로우 + Java 고득점 (이중 보너스)
    //   java_expert   → 팔로우 없음 (기술 매칭만으로 피드 수신)
    // ──────────────────────────────────────────────
    private void createFollowGraph() {
        User admin = userByEmail(ADMIN_EMAIL);
        User javaExpert = userByEmail("java_expert@test.com");
        User reactExpert = userByEmail("react_expert@test.com");
        User devopsUser = userByEmail("devops_user@test.com");
        User followerOnly = userByEmail("follower_only@test.com");
        User bothMatch = userByEmail("both_match@test.com");
        User popularPoster = userByEmail("popular_poster@test.com");
        User searchUser = userByEmail("search_target_kim@test.com");

        // admin 중심 관계
        followService.follow(admin.getId(), javaExpert.getId());
        followService.follow(admin.getId(), reactExpert.getId());
        followService.follow(admin.getId(), popularPoster.getId());
        followService.follow(javaExpert.getId(), admin.getId());
        followService.follow(reactExpert.getId(), admin.getId());

        // follower_only: admin만 팔로우 (기술점수 없음 → 팔로우 피드만)
        followService.follow(followerOnly.getId(), admin.getId());

        // both_match: admin 팔로우 + Java 고득점 (이중 보너스 검증)
        followService.follow(bothMatch.getId(), admin.getId());
        followService.follow(bothMatch.getId(), javaExpert.getId());

        // devops_user 관계
        followService.follow(devopsUser.getId(), admin.getId());
        followService.follow(admin.getId(), devopsUser.getId());

        // popularPoster: 여러 명이 팔로우 (좋아요 많이 받는 구조)
        followService.follow(javaExpert.getId(), popularPoster.getId());
        followService.follow(reactExpert.getId(), popularPoster.getId());
        followService.follow(devopsUser.getId(), popularPoster.getId());

        // search_target_kim: 전원 팔로우
        for (DemoAccountRow row : DEMO_SIGNUPS) {
            User target = userByEmail(row.email());
            if (!target.getId().equals(searchUser.getId())) {
                followService.follow(searchUser.getId(), target.getId());
            }
        }
    }

    // ──────────────────────────────────────────────
    // 게시글 생성
    // 시나리오별 게시글이 피드에 올바르게 노출되는지 확인 가능
    // ──────────────────────────────────────────────
    private List<Post> createPosts(List<User> users) {
        List<PostSeedRow> rows = buildPostSeedRows();
        List<Post> saved = new ArrayList<>();

        for (PostSeedRow row : rows) {
            User author = userByEmail(row.authorEmail());
            Post post = Post.builder()
                    .user(author)
                    .title(row.title())
                    .content(row.content())
                    .build();

            for (String techName : row.techNames()) {
                post.addTechTag(requireSeededTechnology(techName));
            }

            postRepository.save(post);
            saved.add(post);

            if (row.imageUrl() != null) {
                postMediaRepository.save(PostMedia.builder()
                        .post(post)
                        .sourceUrl(row.imageUrl())
                        .mediaType(MediaType.jpg)
                        .sequence((short) 1)
                        .build());
            }

            feedService.registerPostToGlobalFeed(post);
            List<Long> techIds = post.getTechTags().stream()
                    .map(pt -> pt.getTechnology().getId())
                    .toList();
            feedService.deliverPostToFeeds(post, techIds);
        }

        // 텍스트 전용 admin 게시글
        Post adminTextOnly = Post.builder()
                .user(userByEmail(ADMIN_EMAIL))
                .title(ADMIN_TEXT_ONLY_POST_TITLE)
                .content("프로필 그리드·피드에서 텍스트 전용 카드 UI를 확인할 수 있습니다.")
                .build();
        adminTextOnly.addTechTag(requireSeededTechnology("Java"));
        adminTextOnly.addTechTag(requireSeededTechnology("Spring Boot"));
        postRepository.save(adminTextOnly);
        saved.add(adminTextOnly);
        feedService.registerPostToGlobalFeed(adminTextOnly);
        List<Long> adminTechIds = adminTextOnly.getTechTags().stream()
                .map(pt -> pt.getTechnology().getId())
                .toList();
        feedService.deliverPostToFeeds(adminTextOnly, adminTechIds);

        return saved;
    }

    private List<PostSeedRow> buildPostSeedRows() {
        return List.of(
                // ── admin 게시글 (Java/Spring) ──────────────────────────────
                // → java_expert(기술 매칭), both_match(팔로우+기술), follower_only(팔로우) 피드에 전달
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "Spring Boot 3.x 운영 팁 모음",
                        "프로덕션에서 자주 마주치는 설정들을 정리했습니다.",
                        new String[] {"Java", "Spring Boot", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800"),
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "PostgreSQL 인덱스 튜닝 노트",
                        "B-Tree vs GiST 선택 기준과 실행 계획 읽는 법입니다.",
                        new String[] {"PostgreSQL", "Java"},
                        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"),
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "Redis 캐시 전략 정리",
                        "TTL, 캐시 스탬피드, 배치 갱신 패턴을 다뤘습니다.",
                        new String[] {"Redis", "Spring Boot"},
                        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800"),

                // ── java_expert 게시글 ──────────────────────────────────────
                // → admin(팔로우), both_match(팔로우+기술) 피드에 전달
                new PostSeedRow(
                        "java_expert@test.com",
                        "Java 21 가상 스레드 성능 비교",
                        "Virtual Thread vs Platform Thread 벤치마크 결과입니다.",
                        new String[] {"Java", "Spring Boot"},
                        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),
                new PostSeedRow(
                        "java_expert@test.com",
                        "JPA N+1 완전 정복",
                        "Fetch Join, EntityGraph, Batch Size 비교 분석입니다.",
                        new String[] {"Java", "Spring Boot", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),

                // ── react_expert 게시글 ─────────────────────────────────────
                // → admin(팔로우), react_expert 팔로워 피드에 전달
                new PostSeedRow(
                        "react_expert@test.com",
                        "React 19 주요 변경사항 정리",
                        "use() 훅과 Server Actions 실전 예제입니다.",
                        new String[] {"React", "TypeScript"},
                        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"),
                new PostSeedRow(
                        "react_expert@test.com",
                        "TypeScript 5.x 타입 체조",
                        "Conditional Types, infer 패턴 정리입니다.",
                        new String[] {"TypeScript", "Node.js"},
                        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800"),

                // ── devops_user 게시글 ──────────────────────────────────────
                new PostSeedRow(
                        "devops_user@test.com",
                        "Kubernetes 헬스체크 완벽 설정",
                        "liveness/readiness/startup probe 차이점과 예시입니다.",
                        new String[] {"Kubernetes", "Docker"},
                        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "Docker 멀티스테이지 빌드 최적화",
                        "이미지 크기를 1/5로 줄인 빌드 전략입니다.",
                        new String[] {"Docker", "Amazon Web Services (AWS)"},
                        "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "AWS VPC peering 구성 정리",
                        "서브넷·라우팅 테이블 설정 메모입니다.",
                        new String[] {"Amazon Web Services (AWS)", "Docker"},
                        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"),

                // ── popular_poster 게시글 (좋아요 다수 → 글로벌 피드 상위) ──
                new PostSeedRow(
                        "popular_poster@test.com",
                        "개발자 필수 도구 모음 2025",
                        "터미널·IDE·협업 툴 추천 목록입니다.",
                        new String[] {"Docker", "Java"},
                        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"),
                new PostSeedRow(
                        "popular_poster@test.com",
                        "풀스택 프로젝트 구조 가이드",
                        "Spring Boot + React 모노레포 구성 예시입니다.",
                        new String[] {"Java", "Spring Boot", "React"},
                        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800"),

                // ── 검색 테스트용 ────────────────────────────────────────────
                new PostSeedRow(
                        "search_target_kim@test.com",
                        "검색용 키워드 devstagram_demo_post",
                        "GET /api/users/search?keyword=devstagram_demo 로 검색해 보세요.",
                        new String[] {"Java"},
                        "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800"));
    }

    // ──────────────────────────────────────────────
    // 인터랙션 (좋아요 분포로 글로벌 피드 점수 차별화)
    // ──────────────────────────────────────────────
    private void createPostInteractions(List<User> users, List<Post> posts) {
        if (posts.isEmpty()) return;

        User admin = userByEmail(ADMIN_EMAIL);
        User javaExpert = userByEmail("java_expert@test.com");
        User reactExpert = userByEmail("react_expert@test.com");
        User devopsUser = userByEmail("devops_user@test.com");
        User followerOnly = userByEmail("follower_only@test.com");
        User bothMatch = userByEmail("both_match@test.com");
        User popularPoster = userByEmail("popular_poster@test.com");
        User threshold50 = userByEmail("threshold_50@test.com");
        User searchUser = userByEmail("search_target_kim@test.com");

        // popular_poster 게시글: 전원 좋아요 → 글로벌 피드 최상단
        posts.stream()
                .filter(p -> p.getUser().getId().equals(popularPoster.getId()))
                .forEach(p -> {
                    for (User u : users) {
                        postService.togglePostLike(p.getId(), u.getId());
                    }
                });

        // admin 게시글: 여러 명 좋아요
        posts.stream().filter(p -> p.getUser().getId().equals(admin.getId())).forEach(p -> {
            postService.togglePostLike(p.getId(), javaExpert.getId());
            postService.togglePostLike(p.getId(), bothMatch.getId());
            postService.togglePostLike(p.getId(), followerOnly.getId());
            postService.togglePostLike(p.getId(), threshold50.getId());
        });

        // java_expert 게시글: 일부만 좋아요
        posts.stream()
                .filter(p -> p.getUser().getId().equals(javaExpert.getId()))
                .forEach(p -> {
                    postService.togglePostLike(p.getId(), admin.getId());
                    postService.togglePostLike(p.getId(), bothMatch.getId());
                });

        // react_expert 게시글
        posts.stream()
                .filter(p -> p.getUser().getId().equals(reactExpert.getId()))
                .forEach(p -> postService.togglePostLike(p.getId(), admin.getId()));

        // devops_user 게시글
        posts.stream()
                .filter(p -> p.getUser().getId().equals(devopsUser.getId()))
                .forEach(p -> {
                    postService.togglePostLike(p.getId(), admin.getId());
                    postService.togglePostLike(p.getId(), searchUser.getId());
                });

        // 댓글
        Post firstPost = posts.getFirst();
        commentService.createComment(
                firstPost.getId(), admin.getId(), new CommentCreateReq("admin 단독 댓글 (수정·삭제 테스트용)", null));
        commentService.createComment(firstPost.getId(), javaExpert.getId(), new CommentCreateReq("좋은 내용이네요!", null));
        Long threadRoot =
                commentService.createComment(firstPost.getId(), admin.getId(), new CommentCreateReq("스레드 루트 댓글", null));
        commentService.createComment(firstPost.getId(), bothMatch.getId(), new CommentCreateReq("대댓글 A", threadRoot));
        commentService.createComment(
                firstPost.getId(), followerOnly.getId(), new CommentCreateReq("대댓글 B", threadRoot));

        // 텍스트 전용 마지막 게시글 댓글
        Post lastPost = posts.getLast();
        commentService.createComment(
                lastPost.getId(), javaExpert.getId(), new CommentCreateReq("텍스트 전용 글 — 공감합니다", null));
        commentService.createComment(
                lastPost.getId(), followerOnly.getId(), new CommentCreateReq("이미지 없이도 잘 보이네요.", null));
    }

    // ──────────────────────────────────────────────
    // 스토리
    // ──────────────────────────────────────────────
    private void createStories(List<User> users) {
        User admin = userByEmail(ADMIN_EMAIL);
        User user1 = userByEmail("java_expert@test.com");

        String[] storyUrls = {
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400",
            "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400",
            "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400",
        };

        for (int i = 0; i < storyUrls.length; i++) {
            User storyUser = (i == 0) ? admin : users.get(i % users.size());
            StoryMedia media = StoryMedia.builder()
                    .mediaType(MediaType.jpg)
                    .sourceUrl(storyUrls[i])
                    .build();
            Story story = Story.builder()
                    .user(storyUser)
                    .content("데모 스토리 " + (i + 1))
                    .thumbnailUrl(storyUrls[i])
                    .storyMedia(media)
                    .build();
            storyRepository.save(story);
            if (i == 0) {
                storyTagRepository.save(
                        StoryTag.builder().story(story).target(user1).build());
            }
        }
    }

    private void createStoryInteractions(List<User> users) {
        List<Story> activeStories =
                storyRepository.findAll().stream().filter(s -> !s.isDeleted()).toList();
        if (activeStories.isEmpty() || users.size() < 2) return;

        Story first = activeStories.getFirst();
        User viewer = users.stream()
                .filter(u -> !u.getId().equals(first.getUser().getId()))
                .findFirst()
                .orElse(users.get(1));
        storyService.recordSingleStoryView(
                first.getId(), viewer.getId(), first.getUser().getId());
        storyService.patchStoryLike(first.getId(), viewer.getId());
    }

    private void createAdminStoryForHardDeleteDemo(User admin) {
        String url = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400";
        storyRepository.save(Story.builder()
                .user(admin)
                .content("HARD_DELETE_DEMO_STORY — hard-delete API 테스트용(호출 시 제거됨)")
                .thumbnailUrl(url)
                .storyMedia(StoryMedia.builder()
                        .mediaType(MediaType.jpg)
                        .sourceUrl(url)
                        .build())
                .build());
    }

    private void createArchivedStoryForAdmin(User admin) {
        String url = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400";
        Story archived = Story.builder()
                .user(admin)
                .content("아카이브 데모용(소프트 삭제됨)")
                .thumbnailUrl(url)
                .storyMedia(StoryMedia.builder()
                        .mediaType(MediaType.jpg)
                        .sourceUrl(url)
                        .build())
                .build();
        storyRepository.save(archived);
        storyService.softDeleteStory(archived.getId(), admin.getId());
    }

    // ──────────────────────────────────────────────
    // DM
    // ──────────────────────────────────────────────
    private void createDmRoomsAndMessages(List<Post> posts) {
        User admin = userByEmail(ADMIN_EMAIL);
        User javaExpert = userByEmail("java_expert@test.com");
        User reactExpert = userByEmail("react_expert@test.com");

        Post samplePost = posts.getFirst();
        Story sampleStory = resolveSampleStoryForDmLink(admin);

        seedDmRoom1v1(admin, javaExpert, samplePost, sampleStory);
        seedDmGroupRoom(admin, javaExpert, reactExpert);
    }

    private Story resolveSampleStoryForDmLink(User admin) {
        return storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(admin.getId()).stream()
                .findFirst()
                .orElseGet(() -> storyRepository.findAll().stream()
                        .filter(s -> !s.isDeleted())
                        .findFirst()
                        .orElseThrow());
    }

    private void seedDmRoom1v1(User admin, User other, Post samplePost, Story sampleStory) {
        DmRoom room = DmRoom.create1v1Room(other.getNickname());
        dmRoomRepository.save(room);
        dmRoomUserRepository.save(DmRoomUser.create(room, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(room, other, new Date()));

        dmRepository.save(Dm.create(room, admin, MessageType.TEXT, "1:1 텍스트 메시지", null, true));
        dmRepository.save(Dm.create(room, other, MessageType.TEXT, "답장입니다", null, true));
        dmRepository.save(Dm.create(
                room,
                admin,
                MessageType.POST,
                "devstagram://post?id=" + samplePost.getId(),
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200",
                true));
        dmRepository.save(Dm.create(
                room,
                other,
                MessageType.STORY,
                "devstagram://story?id=" + sampleStory.getId() + "&v=" + System.currentTimeMillis(),
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200",
                true));
    }

    private void seedDmGroupRoom(User admin, User user1, User user2) {
        DmRoom groupRoom = DmRoom.createGroupRoom("데모 그룹 채팅");
        dmRoomRepository.save(groupRoom);
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user1, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user2, new Date()));

        dmRepository.save(Dm.create(groupRoom, admin, MessageType.TEXT, "그룹방 오픈", null, true));
        dmRepository.save(Dm.create(groupRoom, user1, MessageType.TEXT, "반갑습니다", null, true));
        dmRepository.save(Dm.create(groupRoom, user2, MessageType.SYSTEM, "user2님이 참여했습니다.", null, true));
    }

    // ──────────────────────────────────────────────
    // 헬퍼
    // ──────────────────────────────────────────────
    private Technology requireSeededTechnology(String techName) {
        return technologyRepository
                .findByName(techName)
                .orElseThrow(() -> new IllegalStateException("Docker DB seed 기술이 없습니다: '" + techName
                        + "'. Postgres 초기화 시 infra/init-data/insert_tech.sql 이 실행됐는지 확인하세요."));
    }

    private User userByEmail(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email).orElseThrow();
    }

    private record PostSeedRow(String authorEmail, String title, String content, String[] techNames, String imageUrl) {}
}
