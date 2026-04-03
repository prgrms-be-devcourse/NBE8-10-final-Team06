package com.devstagram.global.initData;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;

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

    private static final List<String> SEED_TECH_NAMES_FOR_SCORE_POOL = List.of(
            "Java",
            "Spring Boot",
            "React",
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "Redis",
            "MongoDB",
            "Docker",
            "Kubernetes",
            "Amazon Web Services (AWS)");

    private static final List<DemoAccountRow> DEMO_SIGNUPS = List.of(
            new DemoAccountRow("admin", ADMIN_EMAIL, Resume.SENIOR),
            new DemoAccountRow("user1", "user1@test.com", Resume.JUNIOR),
            new DemoAccountRow("user2", "user2@test.com", Resume.UNDERGRADUATE),
            new DemoAccountRow("user3", "user3@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("user4", "user4@test.com", Resume.SENIOR),
            new DemoAccountRow("user5", "user5@test.com", Resume.JUNIOR),
            new DemoAccountRow("user6", "user6@test.com", Resume.INTERMEDIATE),
            new DemoAccountRow("user7", "user7@test.com", Resume.SENIOR),
            new DemoAccountRow("user8", "user8@test.com", Resume.UNDERGRADUATE),
            new DemoAccountRow("search_target_kim", "search_target_kim@test.com", Resume.JUNIOR));

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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (shouldSkip()) {
            return;
        }
        loadDemoDataset();
    }

    private boolean shouldSkip() {
        // 이미 관리자 이메일이 존재한다면 BaseInitData 들어간 걸로 간주하여 스킵 -> 중복으로 쌓이는거 막으려고
        if (userRepository.findByEmailAndIsDeletedFalse(ADMIN_EMAIL).isPresent()) {
            return true;
        }
        // 기술 스택 데이터가 주입되지 않았다면 실행을 중단
        if (technologyRepository.count() < MIN_SEED_TECH_ROWS) {
            log.warn(
                    "BaseInitData 건너뜀: technology 행이 {}개 미만입니다. Docker Postgres 초기화 시 infra/init-data/insert_tech.sql 시드를 확인하세요.",
                    MIN_SEED_TECH_ROWS);
            return true;
        }
        return false;
    }

    // 데이터 주입
    private void loadDemoDataset() {
        List<User> users = createUsers();
        createTechScores(users);
        createFollowGraph(users);
        List<Post> posts = createPosts(users);
        createStories(users);
        createAdminStoryForHardDeleteDemo(userByEmail(ADMIN_EMAIL));
        createPostInteractions(users, posts);
        createStoryInteractions(users);
        createArchivedStoryForAdmin(userByEmail(ADMIN_EMAIL));
        createDmRoomsAndMessages(posts);
    }

    private Technology requireSeededTechnology(String techName) {
        return technologyRepository
                .findByName(techName)
                .orElseThrow(() -> new IllegalStateException("Docker DB seed 기술이 없습니다: '"
                        + techName
                        + "'. Postgres 초기화 시 infra/init-data/insert_tech.sql 이 실행됐는지 확인하세요."));
    }

    private List<Technology> seededTechnologyPoolForScores() {
        List<Technology> pool = new ArrayList<>();
        for (String name : SEED_TECH_NAMES_FOR_SCORE_POOL) {
            pool.add(requireSeededTechnology(name));
        }
        return pool;
    }

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

    private void createTechScores(List<User> users) {
        List<Technology> pool = seededTechnologyPoolForScores();
        if (users.isEmpty() || pool.isEmpty()) {
            return;
        }
        for (User user : users) {
            List<Technology> shuffled = new ArrayList<>(pool);
            Collections.shuffle(shuffled);
            for (int i = 0; i < Math.min(4, shuffled.size()); i++) {
                Technology targetTech = shuffled.get(i);
                UserTechScore score = new UserTechScore(user, targetTech, targetTech.getCategory());
                score.increaseScore((int) (Math.random() * 90) + 10);
                userTechScoreRepository.save(score);
            }
        }
    }

    private void createFollowGraph(List<User> users) {
        User admin = userByEmail(ADMIN_EMAIL);
        User u1 = userByEmail("user1@test.com");
        User u2 = userByEmail("user2@test.com");
        User u3 = userByEmail("user3@test.com");
        User u4 = userByEmail("user4@test.com");
        User u5 = userByEmail("user5@test.com");
        User searchUser = userByEmail("search_target_kim@test.com");

        followService.follow(admin.getId(), u1.getId());
        followService.follow(admin.getId(), u2.getId());
        followService.follow(admin.getId(), u3.getId());
        followService.follow(admin.getId(), searchUser.getId());
        followService.follow(u1.getId(), admin.getId());
        followService.follow(u2.getId(), admin.getId());
        followService.follow(u3.getId(), admin.getId());
        followService.follow(u1.getId(), u2.getId());
        followService.follow(u2.getId(), u1.getId());
        followService.follow(u4.getId(), u5.getId());
        followService.follow(u5.getId(), u4.getId());
        followService.follow(searchUser.getId(), admin.getId());

        for (User u : users) {
            if (u.getId().equals(admin.getId()) || u.getId().equals(searchUser.getId())) {
                continue;
            }
            followService.follow(searchUser.getId(), u.getId());
        }
    }

    private List<List<Technology>> buildDemoPostTagSets() {
        Technology java = requireSeededTechnology("Java");
        Technology spring = requireSeededTechnology("Spring Boot");
        Technology react = requireSeededTechnology("React");
        Technology ts = requireSeededTechnology("TypeScript");
        Technology node = requireSeededTechnology("Node.js");
        Technology pg = requireSeededTechnology("PostgreSQL");
        Technology redis = requireSeededTechnology("Redis");
        Technology mongo = requireSeededTechnology("MongoDB");
        Technology docker = requireSeededTechnology("Docker");
        Technology k8s = requireSeededTechnology("Kubernetes");
        Technology aws = requireSeededTechnology("Amazon Web Services (AWS)");
        return List.of(
                List.of(java, spring, pg),
                List.of(react, ts, node),
                List.of(docker, k8s, aws),
                List.of(k8s, docker, redis),
                List.of(pg, redis),
                List.of(redis, mongo),
                List.of(mongo, java),
                List.of(aws, docker, pg),
                List.of(node, ts),
                List.of(java, react, docker),
                List.of(spring, pg, aws),
                List.of(react, spring, mongo),
                List.of(java, docker));
    }

    private List<Post> createPosts(List<User> users) {
        String[] titles = {
            "Spring Boot 3.x 운영 팁",
            "React 19 + TypeScript 프로젝트 구조",
            "Docker로 로컬 DB 띄우기",
            "Kubernetes 헬스체크 설정",
            "PostgreSQL 인덱스 튜닝 노트",
            "Redis 캐시 전략 정리",
            "MongoDB 스키마 설계 회고",
            "AWS VPC peering 정리",
            "Node.js 스트림 처리",
            "풀스택 데모 포스트 Alpha",
            "풀스택 데모 포스트 Beta",
            "검색용 키워드 devstagram_demo_post",
            "admin 소유 게시글 수정·삭제 데모",
        };

        String[] contents = {
            "백엔드 운영 시 알아두면 좋은 설정들입니다.",
            "프론트엔드 폴더 구조와 타입 안정성을 챙긴 예시입니다.",
            "compose로 Postgres/Redis를 한 번에 올립니다.",
            "liveness/readiness probe 예시입니다.",
            "B-Tree vs GiST 선택 기준을 정리했습니다.",
            "TTL, 캐시 스탬피드, 배치 갱신을 다뤘습니다.",
            "문서형 DB 마이그레이션 시 주의점입니다.",
            "서브넷·라우팅 테이블 구성 메모입니다.",
            "Readable/Writable 스트림 파이프라인입니다.",
            "피드·스크랩·좋아요 API를 한 번에 시험해 보세요.",
            "댓글·대댓글·좋아요 시나리오용 본문입니다.",
            "GET /api/users/search?keyword=devstagram_demo 로 검색해 보세요.",
            "Swagger에서 PUT/DELETE /api/posts/{postId} 호출 시 본인 게시글 여부를 확인하세요.",
        };

        String[] imageUrls = {
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
            "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
            "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800",
            "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800",
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
            "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
            "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800",
            "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
        };

        List<List<Technology>> tagSets = buildDemoPostTagSets();
        User admin = userByEmail(ADMIN_EMAIL);
        List<Post> saved = new ArrayList<>();

        for (int i = 0; i < titles.length; i++) {
            User author = (i < 4 || i == 8) ? admin : users.get(i % users.size());
            Post post = Post.builder()
                    .user(author)
                    .title(titles[i])
                    .content(contents[i])
                    .build();

            for (Technology t : tagSets.get(i)) {
                post.addTechTag(t);
            }

            postRepository.save(post);
            saved.add(post);

            savePrimaryPostMedia(post, imageUrls[i]);
            if (i % 4 == 0) {
                saveSecondaryPostMedia(post);
            }

            feedService.registerPostToGlobalFeed(post);
            feedService.deliverPostToFeeds(post);
        }

        return saved;
    }

    private void savePrimaryPostMedia(Post post, String imageUrl) {
        postMediaRepository.save(PostMedia.builder()
                .post(post)
                .sourceUrl(imageUrl)
                .mediaType(MediaType.jpg)
                .sequence((short) 1)
                .build());
    }

    private void saveSecondaryPostMedia(Post post) {
        postMediaRepository.save(PostMedia.builder()
                .post(post)
                .sourceUrl("https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800")
                .mediaType(MediaType.jpg)
                .sequence((short) 2)
                .build());
    }

    private void createStories(List<User> users) {
        User admin = userByEmail(ADMIN_EMAIL);
        User user1 = userByEmail("user1@test.com");

        String[] storyUrls = {
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400",
            "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400",
            "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400",
        };

        for (int i = 0; i < storyUrls.length; i++) {
            User user = (i == 0) ? admin : users.get(i % users.size());
            StoryMedia media = StoryMedia.builder()
                    .mediaType(MediaType.jpg)
                    .sourceUrl(storyUrls[i])
                    .build();

            Story story = Story.builder()
                    .user(user)
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

    private void createPostInteractions(List<User> users, List<Post> posts) {
        if (posts.isEmpty()) {
            return;
        }

        User admin = userByEmail(ADMIN_EMAIL);
        User u1 = userByEmail("user1@test.com");
        User u2 = userByEmail("user2@test.com");
        Post firstPost = posts.getFirst();

        seedPostLikesAndScraps(users, posts, admin, u1, u2, firstPost);
        seedCommentsOnFirstPost(users, admin, u1, u2, firstPost);
        seedCommentsOnOtherPosts(users, posts);
    }

    private void seedPostLikesAndScraps(
            List<User> users, List<Post> posts, User admin, User u1, User u2, Post firstPost) {
        for (Post post : posts) {
            if (post.getId().equals(firstPost.getId())) {
                for (User u : users) {
                    postService.togglePostLike(post.getId(), u.getId());
                }
            } else {
                postService.togglePostLike(post.getId(), admin.getId());
                postService.togglePostLike(post.getId(), u1.getId());
                if (users.size() > 2) {
                    postService.togglePostLike(post.getId(), u2.getId());
                }
            }
        }

        postService.toggleScrap(posts.get(0).getId(), u1.getId());
        if (posts.size() > 1) {
            postService.toggleScrap(posts.get(1).getId(), u1.getId());
        }
        if (posts.size() > 2) {
            postService.toggleScrap(posts.get(2).getId(), u2.getId());
        }
        postService.toggleScrap(posts.get(0).getId(), admin.getId());
        if (posts.size() > 4) {
            postService.toggleScrap(posts.get(3).getId(), admin.getId());
        }
    }

    private void seedCommentsOnFirstPost(List<User> users, User admin, User u1, User u2, Post firstPost) {
        commentService.createComment(
                firstPost.getId(), admin.getId(), new CommentCreateReq("admin 단독 댓글(삭제·수정 테스트)", null));
        for (int c = 0; c < 12; c++) {
            User commenter = users.get(c % users.size());
            commentService.createComment(
                    firstPost.getId(), commenter.getId(), new CommentCreateReq("댓글 샘플 " + c, null));
        }

        Long likeDemoCommentId = commentService.createComment(
                firstPost.getId(), admin.getId(), new CommentCreateReq("댓글 좋아요 API 데모", null));
        commentService.toggleCommentLike(likeDemoCommentId, u1.getId());

        Long threadRootId =
                commentService.createComment(firstPost.getId(), admin.getId(), new CommentCreateReq("스레드 루트 댓글", null));
        commentService.createComment(firstPost.getId(), u1.getId(), new CommentCreateReq("대댓글 A", threadRootId));
        commentService.createComment(firstPost.getId(), u2.getId(), new CommentCreateReq("대댓글 B", threadRootId));
        for (int r = 0; r < 6; r++) {
            User replyAuthor = users.get((r + 3) % users.size());
            commentService.createComment(
                    firstPost.getId(), replyAuthor.getId(), new CommentCreateReq("대댓글 페이징 " + r, threadRootId));
        }
    }

    private void seedCommentsOnOtherPosts(List<User> users, List<Post> posts) {
        for (int p = 1; p < Math.min(4, posts.size()); p++) {
            Post post = posts.get(p);
            Long root = commentService.createComment(
                    post.getId(), users.get(p % users.size()).getId(), new CommentCreateReq("포스트 " + p + " 댓글", null));
            commentService.createComment(
                    post.getId(), users.get((p + 1) % users.size()).getId(), new CommentCreateReq("답글", root));
        }
    }

    private void createStoryInteractions(List<User> users) {
        List<Story> activeStories =
                storyRepository.findAll().stream().filter(s -> !s.isDeleted()).toList();
        if (activeStories.isEmpty() || users.size() < 2) {
            return;
        }

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
        StoryMedia media =
                StoryMedia.builder().mediaType(MediaType.jpg).sourceUrl(url).build();
        storyRepository.save(Story.builder()
                .user(admin)
                .content("HARD_DELETE_DEMO_STORY — hard-delete API 테스트용(호출 시 제거됨)")
                .thumbnailUrl(url)
                .storyMedia(media)
                .build());
    }

    private void createArchivedStoryForAdmin(User admin) {
        String url = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400";
        StoryMedia media =
                StoryMedia.builder().mediaType(MediaType.jpg).sourceUrl(url).build();
        Story archived = Story.builder()
                .user(admin)
                .content("아카이브 데모용(소프트 삭제됨)")
                .thumbnailUrl(url)
                .storyMedia(media)
                .build();
        storyRepository.save(archived);
        storyService.softDeleteStory(archived.getId(), admin.getId());
    }

    private void createDmRoomsAndMessages(List<Post> posts) {
        User admin = userByEmail(ADMIN_EMAIL);
        User user1 = userByEmail("user1@test.com");
        User user2 = userByEmail("user2@test.com");

        Post samplePost = posts.getFirst();
        Story sampleStory = resolveSampleStoryForDmLink(admin);

        seedDmRoomAdminUser1(admin, user1, samplePost, sampleStory);
        seedDmGroupDemoRoom(admin, user1, user2);
    }

    private Story resolveSampleStoryForDmLink(User admin) {
        return storyRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtAsc(admin.getId()).stream()
                .findFirst()
                .orElseGet(() -> storyRepository.findAll().stream()
                        .filter(s -> !s.isDeleted())
                        .findFirst()
                        .orElseThrow());
    }

    private void seedDmRoomAdminUser1(User admin, User user1, Post samplePost, Story sampleStory) {
        DmRoom room1v1 = DmRoom.create1v1Room(user1.getNickname());
        dmRoomRepository.save(room1v1);
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, user1, new Date()));

        dmRepository.save(Dm.create(room1v1, admin, MessageType.TEXT, "1:1 텍스트 메시지", null, true));
        dmRepository.save(Dm.create(room1v1, user1, MessageType.TEXT, "답장입니다", null, true));
        dmRepository.save(Dm.create(
                room1v1,
                admin,
                MessageType.POST,
                "devstagram://post?id=" + samplePost.getId(),
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200",
                true));
        dmRepository.save(Dm.create(
                room1v1,
                user1,
                MessageType.STORY,
                "devstagram://story?id=" + sampleStory.getId() + "&v=" + System.currentTimeMillis(),
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200",
                true));
        dmRepository.save(Dm.create(
                room1v1,
                admin,
                MessageType.IMAGE,
                "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=400",
                null,
                true));
    }

    private void seedDmGroupDemoRoom(User admin, User user1, User user2) {
        DmRoom groupRoom = DmRoom.createGroupRoom("데모 그룹 채팅");
        dmRoomRepository.save(groupRoom);
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user1, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user2, new Date()));

        dmRepository.save(Dm.create(groupRoom, admin, MessageType.TEXT, "그룹방 오픈", null, true));
        dmRepository.save(Dm.create(groupRoom, user1, MessageType.TEXT, "반갑습니다", null, true));
        dmRepository.save(Dm.create(groupRoom, user2, MessageType.SYSTEM, "user2님이 참여했습니다.", null, true));
    }

    private User userByEmail(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email).orElseThrow();
    }
}
