package com.devstagram.global.initData;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
            new DemoAccountRow("search_target_kim", "search_target_kim@test.com", Resume.JUNIOR), // 검색 테스트용
            // 기술별 전문가 계정
            new DemoAccountRow("frontend_pro", "frontend_pro@test.com", Resume.SENIOR),
            new DemoAccountRow("ml_engineer", "ml_engineer@test.com", Resume.SENIOR),
            new DemoAccountRow("mobile_dev", "mobile_dev@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("db_admin", "db_admin@test.com", Resume.SENIOR),
            new DemoAccountRow("rust_developer", "rust_developer@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("gamedev_user2", "gamedev_user2@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("data_scientist", "data_scientist@test.com", Resume.SENIOR),
            new DemoAccountRow("security_expert", "security_expert@test.com", Resume.SENIOR),
            new DemoAccountRow("python_dev", "python_dev@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("go_developer", "go_developer@test.com", Resume.SENIOR)
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
            new UserTechScoreRow("search_target_kim@test.com", "Spring Boot", 50),

            // frontend_pro: 프론트엔드 전문가
            new UserTechScoreRow("frontend_pro@test.com", "React", 95),
            new UserTechScoreRow("frontend_pro@test.com", "TypeScript", 90),
            new UserTechScoreRow("frontend_pro@test.com", "Next.js", 85),
            new UserTechScoreRow("frontend_pro@test.com", "Vue.js", 60),

            // ml_engineer: 데이터·ML 전문가
            new UserTechScoreRow("ml_engineer@test.com", "Python", 95),
            new UserTechScoreRow("ml_engineer@test.com", "SQL", 70),
            new UserTechScoreRow("ml_engineer@test.com", "BigQuery", 55),

            // mobile_dev: 모바일 개발자
            new UserTechScoreRow("mobile_dev@test.com", "Swift", 90),
            new UserTechScoreRow("mobile_dev@test.com", "Kotlin", 85),
            new UserTechScoreRow("mobile_dev@test.com", "Dart", 60),

            // db_admin: 데이터베이스 전문가
            new UserTechScoreRow("db_admin@test.com", "PostgreSQL", 95),
            new UserTechScoreRow("db_admin@test.com", "MySQL", 90),
            new UserTechScoreRow("db_admin@test.com", "Redis", 80),
            new UserTechScoreRow("db_admin@test.com", "MongoDB", 75),
            new UserTechScoreRow("db_admin@test.com", "Elasticsearch", 65),

            // rust_developer: 시스템 프로그래밍
            new UserTechScoreRow("rust_developer@test.com", "Rust", 95),
            new UserTechScoreRow("rust_developer@test.com", "C++", 80),
            new UserTechScoreRow("rust_developer@test.com", "Go", 60),

            // gamedev_user2: 게임 개발자
            new UserTechScoreRow("gamedev_user2@test.com", "C++", 90),
            new UserTechScoreRow("gamedev_user2@test.com", "Lua", 70),
            new UserTechScoreRow("gamedev_user2@test.com", "C#", 65),

            // data_scientist: 데이터 과학자
            new UserTechScoreRow("data_scientist@test.com", "Python", 90),
            new UserTechScoreRow("data_scientist@test.com", "R", 80),
            new UserTechScoreRow("data_scientist@test.com", "SQL", 75),

            // security_expert: 보안 전문가
            new UserTechScoreRow("security_expert@test.com", "Python", 75),
            new UserTechScoreRow("security_expert@test.com", "Bash/Shell", 85),
            new UserTechScoreRow("security_expert@test.com", "Java", 60),

            // python_dev: 파이썬 개발자
            new UserTechScoreRow("python_dev@test.com", "Python", 90),
            new UserTechScoreRow("python_dev@test.com", "FastAPI", 80),
            new UserTechScoreRow("python_dev@test.com", "Django", 70),

            // go_developer: Go 개발자
            new UserTechScoreRow("go_developer@test.com", "Go", 95),
            new UserTechScoreRow("go_developer@test.com", "Docker", 70),
            new UserTechScoreRow("go_developer@test.com", "Kubernetes", 65));

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
        if (shouldSkip()) {
            rehydrateFeedIfEmpty();
            return;
        }
        loadDemoDataset();
    }

    private void rehydrateFeedIfEmpty() {
        if (!feedService.isGlobalFeedEmpty()) return;
        log.info("BaseInitData: Redis 글로벌 피드가 비어있어 DB 게시글로 재수화합니다.");
        List<Post> posts = postRepository.findAllActiveWithTechTags();
        for (Post post : posts) {
            feedService.registerPostToGlobalFeed(post);
            List<Long> techIds = post.getTechTags().stream()
                    .map(pt -> pt.getTechnology().getId())
                    .toList();
            feedService.deliverPostToFeeds(post, techIds);
        }
        log.info("BaseInitData: {}개 게시글 재수화 완료.", posts.size());
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
        createAdminStoryExpiringInOneMinute(userByEmail(ADMIN_EMAIL));
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
                        "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800"),

                // ── frontend_pro 게시글 ─────────────────────────────────────
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "React 18 Concurrent 렌더링 완전 이해",
                        "useTransition, useDeferredValue 실전 예제와 성능 향상 사례를 정리했습니다.",
                        new String[] {"React", "TypeScript"},
                        "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "Next.js 14 App Router 마이그레이션 가이드",
                        "Pages Router에서 App Router로 이전 시 주의사항과 성능 개선 결과입니다.",
                        new String[] {"Next.js", "TypeScript", "React"},
                        "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "TypeScript 유틸리티 타입 실전 활용",
                        "Partial, Required, Pick, Omit, Record 활용 패턴 모음입니다.",
                        new String[] {"TypeScript", "JavaScript"},
                        "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "Vue 3 Composition API vs Options API 비교",
                        "마이그레이션 전 알아야 할 핵심 차이점과 장단점입니다.",
                        new String[] {"Vue.js", "JavaScript", "TypeScript"},
                        "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "Vite 5 번들 최적화 전략",
                        "청크 분할, 트리쉐이킹, 동적 임포트 활용으로 빌드 속도를 2배 높였습니다.",
                        new String[] {"Vite", "TypeScript", "JavaScript"},
                        "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "Astro로 블로그 구축하기",
                        "Island Architecture를 활용한 정적 사이트 구축 경험을 공유합니다.",
                        new String[] {"Astro", "TypeScript"},
                        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800"),
                new PostSeedRow(
                        "frontend_pro@test.com",
                        "CSS 모던 레이아웃 완전 정복",
                        "Grid, Flexbox, Container Queries 실전 예제입니다.",
                        new String[] {"HTML/CSS", "JavaScript"},
                        "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800"),

                // ── ml_engineer 게시글 ──────────────────────────────────────
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "Python asyncio 비동기 프로그래밍 패턴",
                        "async/await, gather, Queue를 활용한 고성능 파이프라인 구성입니다.",
                        new String[] {"Python"},
                        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "Pandas + DuckDB 데이터 분석 워크플로우",
                        "100GB 데이터셋을 메모리 효율적으로 처리하는 방법입니다.",
                        new String[] {"Python", "DuckDB", "SQL"},
                        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "FastAPI ML 모델 서빙 아키텍처",
                        "모델 로딩, 캐싱, 배치 인퍼런스를 FastAPI로 구현한 사례입니다.",
                        new String[] {"FastAPI", "Python"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "SQL 윈도우 함수 완전 정복",
                        "ROW_NUMBER, RANK, LAG, LEAD 실전 분석 쿼리 모음입니다.",
                        new String[] {"SQL", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "BigQuery ML 모델 학습 및 배포",
                        "BigQuery ML을 활용해 SQL만으로 분류 모델을 학습시킨 경험입니다.",
                        new String[] {"BigQuery", "SQL", "Python"},
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "Databricks 스파크 클러스터 최적화",
                        "파티셔닝 전략과 캐싱으로 쿼리 속도를 10배 개선한 사례입니다.",
                        new String[] {"Databricks SQL", "Python", "SQL"},
                        "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=800"),
                new PostSeedRow(
                        "ml_engineer@test.com",
                        "Poetry로 Python 프로젝트 의존성 관리",
                        "pip와 venv를 대체하는 현대적 패키지 관리 워크플로우입니다.",
                        new String[] {"Python", "Poetry"},
                        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),

                // ── mobile_dev 게시글 ───────────────────────────────────────
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "Swift Concurrency: Actor, async/await 실전",
                        "iOS 15+ 동시성 모델로 레이스 컨디션을 없애는 패턴입니다.",
                        new String[] {"Swift"},
                        "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800"),
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "Kotlin Multiplatform으로 iOS·Android 코드 공유",
                        "비즈니스 로직을 KMP로 공유하고 UI는 플랫폼 네이티브로 유지한 사례입니다.",
                        new String[] {"Kotlin"},
                        "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=800"),
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "Flutter Dart 상태관리 Riverpod 2.0 가이드",
                        "Provider에서 Riverpod으로 마이그레이션한 경험과 코드 패턴입니다.",
                        new String[] {"Dart"},
                        "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800"),
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "Android Jetpack Compose 성능 최적화",
                        "recomposition 최소화와 LazyColumn 최적화 기법 정리입니다.",
                        new String[] {"Kotlin"},
                        "https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?w=800"),
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "iOS SwiftUI vs UIKit 혼용 가이드",
                        "레거시 UIKit 코드베이스에 SwiftUI를 점진적으로 도입하는 방법입니다.",
                        new String[] {"Swift"},
                        "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800"),
                new PostSeedRow(
                        "mobile_dev@test.com",
                        "모바일 앱 성능 프로파일링 실전",
                        "Instruments(iOS), Android Studio Profiler 활용법 비교입니다.",
                        new String[] {"Swift", "Kotlin"},
                        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"),

                // ── db_admin 게시글 ─────────────────────────────────────────
                new PostSeedRow(
                        "db_admin@test.com",
                        "PostgreSQL 파티셔닝 전략: Range vs List vs Hash",
                        "수억 건 테이블을 파티셔닝해 쿼리 성능을 10배 개선한 사례입니다.",
                        new String[] {"PostgreSQL", "SQL"},
                        "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "MySQL InnoDB 스토리지 엔진 내부 구조",
                        "Buffer Pool, Change Buffer, Redo Log 동작 원리와 튜닝 방법입니다.",
                        new String[] {"MySQL", "SQL"},
                        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "Redis Cluster 구성과 페일오버 처리",
                        "샤딩 전략과 Sentinel vs Cluster 선택 기준을 정리했습니다.",
                        new String[] {"Redis"},
                        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "MongoDB 집계 파이프라인 고급 패턴",
                        "$lookup, $unwind, $bucket으로 복잡한 분석 쿼리를 작성하는 법입니다.",
                        new String[] {"MongoDB"},
                        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "Elasticsearch 인덱싱 전략과 매핑 최적화",
                        "샤드 크기, 리플리카 설정, 동적 매핑 관리 방법입니다.",
                        new String[] {"Elasticsearch", "Java"},
                        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "MariaDB Galera Cluster 설정 실전",
                        "멀티 마스터 복제 구성과 네트워크 분할 대응 방법입니다.",
                        new String[] {"MariaDB", "SQL"},
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "PostgreSQL pgvector 벡터 유사도 검색",
                        "임베딩 기반 시맨틱 검색 구현과 IVFFlat, HNSW 인덱스 비교입니다.",
                        new String[] {"PostgreSQL", "Python"},
                        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"),
                new PostSeedRow(
                        "db_admin@test.com",
                        "SQLite WAL 모드와 동시성 처리",
                        "경량 서비스에서 PostgreSQL 대신 SQLite로 운영한 경험입니다.",
                        new String[] {"SQLite", "SQL"},
                        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800"),

                // ── rust_developer 게시글 ───────────────────────────────────
                new PostSeedRow(
                        "rust_developer@test.com",
                        "Rust 소유권 시스템 완전 정복",
                        "Move, Copy, Borrow, Lifetime을 실제 코드로 설명합니다.",
                        new String[] {"Rust"},
                        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"),
                new PostSeedRow(
                        "rust_developer@test.com",
                        "Rust Axum으로 고성능 REST API 구축",
                        "Tokio 비동기 런타임 위에서 타입 안전 라우팅을 구현하는 방법입니다.",
                        new String[] {"Rust", "Axum"},
                        "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800"),
                new PostSeedRow(
                        "rust_developer@test.com",
                        "Go 채널과 고루틴 동시성 패턴",
                        "파이프라인, Fan-Out, Fan-In 패턴 구현과 데드락 방지 전략입니다.",
                        new String[] {"Go"},
                        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),
                new PostSeedRow(
                        "rust_developer@test.com",
                        "C++ RAII와 스마트 포인터",
                        "unique_ptr, shared_ptr, weak_ptr 사용 패턴과 메모리 안전성 확보 전략입니다.",
                        new String[] {"C++"},
                        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800"),
                new PostSeedRow(
                        "rust_developer@test.com",
                        "Rust + WebAssembly 브라우저 성능 최적화",
                        "WASM으로 계산 집약 작업을 브라우저에서 네이티브 수준으로 실행한 사례입니다.",
                        new String[] {"Rust", "JavaScript"},
                        "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=800"),
                new PostSeedRow(
                        "rust_developer@test.com",
                        "Cargo 워크스페이스로 모노레포 관리",
                        "Rust 멀티 크레이트 프로젝트 구조와 빌드 최적화 방법입니다.",
                        new String[] {"Rust", "Cargo"},
                        "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800"),

                // ── gamedev_user2 게시글 ────────────────────────────────────
                new PostSeedRow(
                        "gamedev_user2@test.com",
                        "C++ 게임 엔진 ECS 아키텍처 구현",
                        "Entity Component System 패턴으로 유연한 게임 객체 관리 시스템 구현입니다.",
                        new String[] {"C++"},
                        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800"),
                new PostSeedRow(
                        "gamedev_user2@test.com",
                        "Lua 스크립트로 게임 로직 분리하기",
                        "C++ 엔진에 Lua를 임베딩해 핫 리로드 가능한 게임 로직을 구현했습니다.",
                        new String[] {"Lua", "C++"},
                        "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800"),
                new PostSeedRow(
                        "gamedev_user2@test.com",
                        "GDScript로 Godot 4 게임 개발 시작",
                        "Godot 4 신기능과 GDScript 2.0 문법 변경사항 정리입니다.",
                        new String[] {"GDScript"},
                        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800"),
                new PostSeedRow(
                        "gamedev_user2@test.com",
                        "Unity C# 잡 시스템으로 멀티스레드 게임 로직",
                        "Burst Compiler + Job System으로 물리 연산 성능을 5배 향상시킨 사례입니다.",
                        new String[] {"C#"},
                        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800"),
                new PostSeedRow(
                        "gamedev_user2@test.com",
                        "게임 서버 아키텍처: TCP vs UDP vs WebSocket",
                        "실시간 멀티플레이어 게임 네트워크 프로토콜 선택 기준과 구현 패턴입니다.",
                        new String[] {"C++", "Go"},
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800"),

                // ── data_scientist 게시글 ───────────────────────────────────
                new PostSeedRow(
                        "data_scientist@test.com",
                        "R ggplot2 고급 시각화 레시피",
                        "복잡한 데이터를 직관적인 차트로 표현하는 35가지 패턴입니다.",
                        new String[] {"R"},
                        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"),
                new PostSeedRow(
                        "data_scientist@test.com",
                        "Python Polars로 대용량 데이터 처리",
                        "Pandas 대비 10배 빠른 Polars 사용법과 마이그레이션 가이드입니다.",
                        new String[] {"Python", "SQL"},
                        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"),
                new PostSeedRow(
                        "data_scientist@test.com",
                        "Snowflake 데이터 공유와 마켓플레이스",
                        "조직 간 데이터 공유를 Snowflake Share로 구현한 실전 사례입니다.",
                        new String[] {"Snowflake", "SQL"},
                        "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=800"),
                new PostSeedRow(
                        "data_scientist@test.com",
                        "SQL CTE 재귀 쿼리로 계층 데이터 처리",
                        "조직도, 카테고리 트리를 재귀 CTE로 효율적으로 조회하는 방법입니다.",
                        new String[] {"SQL", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800"),
                new PostSeedRow(
                        "data_scientist@test.com",
                        "InfluxDB 시계열 데이터 저장·분석 패턴",
                        "IoT 센서 데이터를 InfluxDB에 효율적으로 저장하고 시각화한 사례입니다.",
                        new String[] {"InfluxDB", "Python"},
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"),
                new PostSeedRow(
                        "data_scientist@test.com",
                        "dbt로 데이터 변환 파이프라인 구축",
                        "ELT 패턴과 dbt 모델링 레이어 설계 방법입니다.",
                        new String[] {"SQL", "Python", "BigQuery"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),

                // ── security_expert 게시글 ──────────────────────────────────
                new PostSeedRow(
                        "security_expert@test.com",
                        "JWT 보안 취약점과 올바른 구현",
                        "알고리즘 혼동 공격, 만료 검증 미비, 시크릿 노출 사례와 대응책입니다.",
                        new String[] {"Java", "Spring Boot"},
                        "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800"),
                new PostSeedRow(
                        "security_expert@test.com",
                        "Bash 쉘 스크립트 보안 강화 가이드",
                        "인젝션 방어, 권한 최소화, 비밀 관리 패턴 정리입니다.",
                        new String[] {"Bash/Shell"},
                        "https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=800"),
                new PostSeedRow(
                        "security_expert@test.com",
                        "OAuth2 PKCE 플로우 완전 이해",
                        "SPA·모바일 앱에서 안전하게 OAuth2를 구현하는 방법입니다.",
                        new String[] {"Java", "TypeScript"},
                        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800"),
                new PostSeedRow(
                        "security_expert@test.com",
                        "SQL 인젝션 방어 완전 가이드",
                        "Prepared Statement, ORM 활용 방법과 실제 공격 패턴 분석입니다.",
                        new String[] {"SQL", "Java", "Python"},
                        "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800"),
                new PostSeedRow(
                        "security_expert@test.com",
                        "컨테이너 보안 모범 사례",
                        "Docker 이미지 스캔, 최소 권한 원칙, 런타임 보안 설정 가이드입니다.",
                        new String[] {"Docker", "Bash/Shell"},
                        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"),
                new PostSeedRow(
                        "security_expert@test.com",
                        "Python 보안 코딩 가이드",
                        "OWASP Top 10 대응 패턴과 의존성 취약점 관리 방법입니다.",
                        new String[] {"Python", "Bash/Shell"},
                        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"),

                // ── python_dev 게시글 ────────────────────────────────────────
                new PostSeedRow(
                        "python_dev@test.com",
                        "FastAPI 의존성 주입과 미들웨어 패턴",
                        "복잡한 비즈니스 로직을 정리하는 FastAPI 아키텍처 설계 방법입니다.",
                        new String[] {"FastAPI", "Python"},
                        "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800"),
                new PostSeedRow(
                        "python_dev@test.com",
                        "Django REST Framework 고급 시리얼라이저",
                        "중첩 객체, 동적 필드, 커스텀 검증 구현 패턴입니다.",
                        new String[] {"Django", "Python"},
                        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"),
                new PostSeedRow(
                        "python_dev@test.com",
                        "Flask-SQLAlchemy ORM 성능 최적화",
                        "N+1 문제 해결, 지연 로딩 vs 즉시 로딩 선택 기준입니다.",
                        new String[] {"Flask", "Python", "SQL"},
                        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"),
                new PostSeedRow(
                        "python_dev@test.com",
                        "Celery + Redis 비동기 태스크 큐 구축",
                        "분산 작업 처리와 재시도 전략, 모니터링 방법을 정리했습니다.",
                        new String[] {"Python", "Redis"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),
                new PostSeedRow(
                        "python_dev@test.com",
                        "Python 타입 힌트 심화: Protocol과 TypeVar",
                        "구조적 서브타이핑과 제네릭 함수로 타입 안전성을 높이는 방법입니다.",
                        new String[] {"Python"},
                        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),
                new PostSeedRow(
                        "python_dev@test.com",
                        "uv로 Python 개발 환경 빠르게 설정",
                        "pip+venv 대비 10배 빠른 uv 패키지 매니저 도입 경험입니다.",
                        new String[] {"Python", "Pip"},
                        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"),

                // ── go_developer 게시글 ─────────────────────────────────────
                new PostSeedRow(
                        "go_developer@test.com",
                        "Go 제네릭으로 타입 안전 컨테이너 구현",
                        "Go 1.18+ 제네릭을 활용한 스택, 큐, 우선순위 큐 구현입니다.",
                        new String[] {"Go"},
                        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),
                new PostSeedRow(
                        "go_developer@test.com",
                        "Go 컨텍스트 패턴과 취소 전파",
                        "ctx를 올바르게 전달하고 타임아웃·취소를 처리하는 패턴입니다.",
                        new String[] {"Go"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),
                new PostSeedRow(
                        "go_developer@test.com",
                        "Kubernetes Operator 개발 with Go",
                        "controller-runtime으로 CRD와 Operator를 구현하는 단계별 가이드입니다.",
                        new String[] {"Go", "Kubernetes"},
                        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"),
                new PostSeedRow(
                        "go_developer@test.com",
                        "Go 벤치마크와 pprof 성능 프로파일링",
                        "메모리 누수 탐지와 CPU 병목 구간 분석 방법입니다.",
                        new String[] {"Go"},
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"),
                new PostSeedRow(
                        "go_developer@test.com",
                        "Terraform으로 AWS 인프라 코드화",
                        "VPC, ECS, RDS를 Terraform 모듈로 관리하는 패턴입니다.",
                        new String[] {"Terraform", "Amazon Web Services (AWS)", "Go"},
                        "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800"),
                new PostSeedRow(
                        "go_developer@test.com",
                        "Go gRPC 서비스 구현 완전 가이드",
                        "Protocol Buffers 정의부터 서버·클라이언트 구현, 인터셉터 설정까지입니다.",
                        new String[] {"Go"},
                        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800"),

                // ── devops_user 추가 게시글 ─────────────────────────────────
                new PostSeedRow(
                        "devops_user@test.com",
                        "GitHub Actions 워크플로우 최적화",
                        "캐싱, 매트릭스 빌드, 재사용 워크플로우로 CI 시간을 50% 단축했습니다.",
                        new String[] {"GitHub Actions", "Docker"},
                        "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "Prometheus + Grafana 모니터링 스택 구축",
                        "메트릭 수집, 알림 규칙, 대시보드 설계 실전 가이드입니다.",
                        new String[] {"Prometheus", "Docker", "Kubernetes"},
                        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "Ansible 플레이북으로 서버 프로비저닝 자동화",
                        "멱등성을 보장하는 역할(Role) 설계와 vault로 비밀 관리하는 방법입니다.",
                        new String[] {"Ansible", "Bash/Shell"},
                        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "Datadog APM 트레이싱 실전 설정",
                        "분산 추적, 로그 연관, 커스텀 메트릭 수집 설정 가이드입니다.",
                        new String[] {"Datadog", "Docker"},
                        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"),
                new PostSeedRow(
                        "devops_user@test.com",
                        "Cloudflare Workers로 엣지 컴퓨팅 구현",
                        "글로벌 엣지에서 A/B 테스트, 봇 차단, 응답 변환을 구현한 경험입니다.",
                        new String[] {"Cloudflare", "TypeScript"},
                        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"),

                // ── admin 추가 게시글 ────────────────────────────────────────
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "Spring Security 6 필터 체인 커스터마이징",
                        "SecurityFilterChain 설정과 커스텀 필터 삽입 방법을 단계별로 설명합니다.",
                        new String[] {"Java", "Spring Boot"},
                        "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800"),
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "Spring Batch 5 마이그레이션 가이드",
                        "JobRepository 변경사항과 새로운 API 사용법 정리입니다.",
                        new String[] {"Java", "Spring Boot", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800"),
                new PostSeedRow(
                        ADMIN_EMAIL,
                        "Kafka + Spring 이벤트 드리븐 아키텍처",
                        "Producer, Consumer, Dead Letter Queue 설계와 재시도 전략입니다.",
                        new String[] {"Java", "Spring Boot"},
                        "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=800"),

                // ── java_expert 추가 게시글 ─────────────────────────────────
                new PostSeedRow(
                        "java_expert@test.com",
                        "QueryDSL 동적 쿼리 고급 패턴",
                        "복잡한 검색 조건을 타입 안전하게 조합하는 방법입니다.",
                        new String[] {"Java", "PostgreSQL"},
                        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800"),
                new PostSeedRow(
                        "java_expert@test.com",
                        "Spring WebFlux 리액티브 프로그래밍",
                        "Mono, Flux, 백프레셔 처리 패턴과 MVC와의 비교입니다.",
                        new String[] {"Java", "Spring Boot"},
                        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800"),
                new PostSeedRow(
                        "java_expert@test.com",
                        "Java 21 Records와 Sealed Classes 실전",
                        "데이터 클래스와 대수적 타입으로 도메인 모델을 표현하는 방법입니다.",
                        new String[] {"Java"},
                        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"),

                // ── react_expert 추가 게시글 ────────────────────────────────
                new PostSeedRow(
                        "react_expert@test.com",
                        "Zustand으로 전역 상태 관리 심화",
                        "슬라이스 패턴, 미들웨어, 영속성 플러그인 활용법입니다.",
                        new String[] {"TypeScript", "React"},
                        "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800"),
                new PostSeedRow(
                        "react_expert@test.com",
                        "React 성능 최적화: memo, useMemo, useCallback",
                        "불필요한 리렌더링을 줄이는 최적화 패턴과 DevTools 활용법입니다.",
                        new String[] {"React", "TypeScript"},
                        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800"),
                new PostSeedRow(
                        "react_expert@test.com",
                        "Svelte vs React 비교 분석",
                        "번들 크기, 반응성 모델, 학습 곡선 비교와 선택 기준입니다.",
                        new String[] {"Svelte", "React", "TypeScript"},
                        "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=800"),
                new PostSeedRow(
                        "react_expert@test.com",
                        "NestJS + TypeScript 백엔드 아키텍처",
                        "모듈, 프로바이더, 파이프, 가드 설계 패턴 정리입니다.",
                        new String[] {"NestJS", "TypeScript", "Node.js"},
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"),

                // ── popular_poster 추가 게시글 ──────────────────────────────
                new PostSeedRow(
                        "popular_poster@test.com",
                        "2025 개발자 학습 로드맵",
                        "백엔드, 프론트엔드, DevOps 각 영역별 추천 학습 경로입니다.",
                        new String[] {"JavaScript", "Java", "Docker"},
                        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800"),
                new PostSeedRow(
                        "popular_poster@test.com",
                        "오픈소스 기여 시작하는 법",
                        "첫 PR부터 메인테이너 되기까지의 경험을 공유합니다.",
                        new String[] {"GitHub Actions", "Bash/Shell"},
                        "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800"));
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

    /** admin 전용 — 만료 시각을 명시해 약 1분 뒤 만료되는 활성 스토리(만료·배너 UI 검증용) */
    private void createAdminStoryExpiringInOneMinute(User admin) {
        String url = "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400";
        storyRepository.save(Story.builder()
                .user(admin)
                .content("만료 1분 전 데모 스토리 — 스토리 만료·노출 제한 테스트용")
                .thumbnailUrl(url)
                .expiredAt(LocalDateTime.now().plusMinutes(1))
                .storyMedia(StoryMedia.builder()
                        .mediaType(MediaType.jpg)
                        .sourceUrl(url)
                        .build())
                .build());
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

        LocalDateTime now = LocalDateTime.now();

        return storyRepository.findActiveNonExpiredByUserIdOrderByCreatedAtAsc(admin.getId(), now).stream()
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
