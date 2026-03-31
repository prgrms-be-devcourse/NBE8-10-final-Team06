package com.devstagram.global.initData;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.comment.Service.CommentService;
import com.devstagram.domain.comment.dto.CommentCreateReq;
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
import com.devstagram.domain.technology.entity.PostTechnology;
import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.entity.UserTechScore;
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.domain.technology.repository.UserTechScoreRepository;
import com.devstagram.domain.technology.service.TechScoreService;
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.FollowRepository;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.AuthService;
import com.devstagram.domain.user.service.FollowService;
import com.devstagram.global.enumtype.MediaType;

import lombok.RequiredArgsConstructor;

@Configuration
@Profile({"dev", "local"})
@RequiredArgsConstructor
public class BaseInitData implements ApplicationRunner {

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
    private final TechCategoryRepository techCategoryRepository;
    private final UserTechScoreRepository userTechScoreRepository;
    private final FollowRepository followRepository;
    private final FeedService feedService;
    private final TechScoreService techScoreService;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        // userTechScoreRepository.deleteAllInBatch();
        // followRepository.deleteAllInBatch();
        // postRepository.deleteAllInBatch();
        // userRepository.deleteAllInBatch();

        // initData();
    }

    private void initData() throws Exception {
        createTechMasterData();
        createUsers();
        createTechScores();
        createFollows();
        createPosts();
        createStories();
        createInteractions();
        createDms();
    }

    private void createTechMasterData() {
        // 1. 카테고리 생성 (빌더 활용)
        TechCategory backend = techCategoryRepository.save(
                TechCategory.builder().name("Backend").color("#3E52D5").build());
        TechCategory frontend = techCategoryRepository.save(
                TechCategory.builder().name("Frontend").color("#61DAFB").build());
        TechCategory infra = techCategoryRepository.save(
                TechCategory.builder().name("Infra").color("#FF9900").build());

        // 2. 세부 기술 생성
        technologyRepository.save(Technology.builder()
                .category(backend)
                .name("Java")
                .color("#E76F00")
                .iconUrl("https://icon.url/java")
                .build());
        technologyRepository.save(Technology.builder()
                .category(backend)
                .name("Spring Boot")
                .color("#6DB33F")
                .iconUrl("https://icon.url/spring")
                .build());
        technologyRepository.save(Technology.builder()
                .category(frontend)
                .name("React")
                .color("#61DAFB")
                .iconUrl("https://icon.url/react")
                .build());
        technologyRepository.save(Technology.builder()
                .category(infra)
                .name("AWS")
                .color("#FF9900")
                .iconUrl("https://icon.url/aws")
                .build());
        technologyRepository.save(Technology.builder()
                .category(infra)
                .name("Docker")
                .color("#2496ED")
                .iconUrl("https://icon.url/docker")
                .build());
    }

    private void createUsers() {
        // 1. 닉네임 배열 (10명)
        String[] nicknames = {
            "admin", "user1", "user2", "user3", "user4",
            "user5", "user6", "user7", "user8", "user9"
        };

        // 2. 이메일 배열 (10명)
        String[] emails = {
            "admin@test.com", "user1@test.com", "user2@test.com", "user3@test.com", "user4@test.com",
            "user5@test.com", "user6@test.com", "user7@test.com", "user8@test.com", "user9@test.com"
        };

        // 3. 이력/경력 상태 배열 (다양하게 섞음)
        Resume[] resumes = {
            Resume.SENIOR, // admin
            Resume.JUNIOR, // user1
            Resume.UNDERGRADUATE, // user2
            Resume.INTERMEDIATE, // user3
            Resume.SENIOR, // user4
            Resume.JUNIOR, // user5
            Resume.INTERMEDIATE, // user6
            Resume.SENIOR, // user7
            Resume.UNDERGRADUATE, // user8
            Resume.JUNIOR // user9
        };

        // 4. 데이터 생성 루프
        for (int i = 0; i < nicknames.length; i++) {
            authService.signup(new SignupRequest(
                    nicknames[i],
                    emails[i],
                    "password123", // 비밀번호는 공통
                    LocalDate.of(1990 + (i % 10), (i % 12) + 1, (i % 28) + 1), // 생년월일 분산
                    i % 2 == 0 ? Gender.MALE : Gender.FEMALE, // 성별 교차
                    "https://github.com/" + nicknames[i], // 깃허브 주소
                    resumes[i]));
        }
    }

    private void createFollows() {
        User admin =
                userRepository.findByEmailAndIsDeletedFalse("admin@test.com").get();
        User user1 =
                userRepository.findByEmailAndIsDeletedFalse("user1@test.com").get();
        User user2 =
                userRepository.findByEmailAndIsDeletedFalse("user2@test.com").get();
        User user3 =
                userRepository.findByEmailAndIsDeletedFalse("user3@test.com").get();

        followService.follow(admin.getId(), user1.getId());
        followService.follow(admin.getId(), user2.getId());
        followService.follow(admin.getId(), user3.getId());
        followService.follow(user1.getId(), admin.getId());
        followService.follow(user2.getId(), admin.getId());
        followService.follow(user3.getId(), admin.getId());
        followService.follow(user1.getId(), user2.getId());
        followService.follow(user2.getId(), user1.getId());
    }

    private void addTagToPost(Post post, Technology tech) {
        if (tech == null) return;

        PostTechnology postTech = PostTechnology.builder()
                .post(post)
                .technology(tech)
                .category(tech.getCategory())
                .build();

        post.getTechTags().add(postTech);
    }

    private void createPosts() {

        List<Technology> allTechs = technologyRepository.findAll();

        Map<String, Technology> techMap = allTechs.stream().collect(Collectors.toMap(Technology::getName, t -> t));

        String[] titles = {"aaaaa", "bbbbb", "ccccc", "ddddd", "eeeee", "fffff"};
        String[] contents = {"AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"};
        String[] imageUrls = {
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
            "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
            "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800"
        };

        List<User> users = userRepository.findAll();

        for (int i = 0; i < titles.length; i++) {
            User user = users.get(i % users.size());
            Post post = Post.builder()
                    .user(user)
                    .title(titles[i])
                    .content(contents[i])
                    .build();

            if (i % 2 == 0) {
                addTagToPost(post, techMap.get("Java"));
                addTagToPost(post, techMap.get("Spring Boot"));
            } else {
                addTagToPost(post, techMap.get("React"));
            }
            addTagToPost(post, techMap.get("AWS"));

            postRepository.save(post);

            PostMedia media = PostMedia.builder()
                    .post(post)
                    .sourceUrl(imageUrls[i])
                    .mediaType(MediaType.jpg)
                    .sequence((short) 1)
                    .build();
            postMediaRepository.save(media);

            if (i == 0) {
                PostMedia media2 = PostMedia.builder()
                        .post(post)
                        .sourceUrl("https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800")
                        .mediaType(MediaType.jpg)
                        .sequence((short) 2)
                        .build();
                postMediaRepository.save(media2);
            }
        }
    }

    private void createStories() {
        List<User> users = userRepository.findAll();
        User admin =
                userRepository.findByEmailAndIsDeletedFalse("admin@test.com").get();
        User user1 =
                userRepository.findByEmailAndIsDeletedFalse("user1@test.com").get();

        String[] storyUrls = {
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400"
        };

        for (int i = 0; i < storyUrls.length; i++) {
            User user = users.get(i % users.size());
            StoryMedia media = StoryMedia.builder()
                    .mediaType(MediaType.jpg)
                    .sourceUrl(storyUrls[i])
                    .build();

            Story story = Story.builder()
                    .user(user)
                    .content("스토리 " + (i + 1))
                    .thumbnailUrl(storyUrls[i]) // 썸네일도 동일하게 설정
                    .storyMedia(media)
                    .build();
            storyRepository.save(story);

            // 첫 번째 스토리에 admin이 user1을 태그함
            if (i == 0 && user.equals(admin)) {
                storyTagRepository.save(
                        StoryTag.builder().story(story).target(user1).build());
            }
        }
    }

    private void createInteractions() {
        List<Post> posts = postRepository.findAll();
        List<User> users = userRepository.findAll();

        for (Post post : posts) {
            for (int i = 0; i < 3; i++) {
                postService.togglePostLike(post.getId(), users.get(i).getId());
            }
        }

        for (int i = 0; i < posts.size(); i++) {
            Post post = posts.get(i);
            Long commentId = commentService.createComment(
                    post.getId(), users.get(0).getId(), new CommentCreateReq("아무도 내맘을 모르죠", null));
            commentService.createComment(
                    post.getId(), users.get(1).getId(), new CommentCreateReq("LOVELOVELOVE", commentId));

            if (i == 0) {
                commentService.createComment(
                        post.getId(), users.get(2).getId(), new CommentCreateReq("또 다시 보여줘야되", null));
            }
        }
    }

    private void createDms() {
        User admin =
                userRepository.findByEmailAndIsDeletedFalse("admin@test.com").get();
        User user1 =
                userRepository.findByEmailAndIsDeletedFalse("user1@test.com").get();
        User user2 =
                userRepository.findByEmailAndIsDeletedFalse("user2@test.com").get();

        Post samplePost = postRepository.findAll().get(0);
        Story sampleStory = storyRepository.findAll().get(0);

        // 1. 1:1 DM 방 (admin <-> user1)
        DmRoom room1v1 = DmRoom.create1v1Room(user1.getNickname());
        dmRoomRepository.save(room1v1);
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, user1, new Date()));

        dmRepository.save(Dm.create(room1v1, admin, MessageType.TEXT, "1111111", null, true));
        dmRepository.save(Dm.create(room1v1, user1, MessageType.TEXT, "22222222", null, true));

        // 게시글 공유 메시지 추가
        dmRepository.save(Dm.create(
                room1v1,
                admin,
                MessageType.POST,
                "devstagram://post?id=" + samplePost.getId(),
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200",
                true));

        // 스토리 공유 메시지 추가 (v 파라미터는 현재 시간 밀리초)
        dmRepository.save(Dm.create(
                room1v1,
                user1,
                MessageType.STORY,
                "devstagram://story?id=" + sampleStory.getId() + "&v=" + System.currentTimeMillis(),
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200",
                true));

        // 2. 그룹 DM 방 (admin, user1, user2)
        DmRoom groupRoom = DmRoom.createGroupRoom("단체방");
        dmRoomRepository.save(groupRoom);
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user1, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user2, new Date()));

        dmRepository.save(Dm.create(groupRoom, admin, MessageType.TEXT, "5555555555555", null, true));
        dmRepository.save(Dm.create(groupRoom, user1, MessageType.TEXT, "6666666666666", null, true));
    }

    private void createTechScores() {
        List<User> users = userRepository.findAll();
        List<Technology> techs = technologyRepository.findAll();

        if (users.isEmpty() || techs.isEmpty()) return;

        for (User user : users) {
            // 한 유저에게 줄 기술들을 섞어서 중복 없이 선택
            java.util.Collections.shuffle(techs);

            // 상위 2개의 기술만 선택 (중복 발생 불가)
            for (int i = 0; i < 2; i++) {
                Technology targetTech = techs.get(i);

                UserTechScore score = new UserTechScore(user, targetTech, targetTech.getCategory());
                int randomScore = (int) (Math.random() * 90) + 10;
                score.increaseScore(randomScore);

                userTechScoreRepository.save(score);
            }
        }
    }

    private void createFeedScoringScenario() {
        User admin =
                userRepository.findByEmailAndIsDeletedFalse("admin@test.com").orElseThrow();
        User user5 =
                userRepository.findByEmailAndIsDeletedFalse("user5@test.com").orElseThrow();
        Technology java = technologyRepository.findAll().get(0); // Java

        techScoreService.increaseScore(admin, java, "POST");

        Post techPost =
                Post.builder().user(user5).title("Java 신기술").content("내용").build();
        addTagToPost(techPost, java);
        postRepository.save(techPost);

        feedService.registerPostToGlobalFeed(techPost);
        feedService.deliverPostToFeeds(techPost);
    }

    private void createNormalPost() {
        User stranger =
                userRepository.findByEmailAndIsDeletedFalse("user4@test.com").orElseThrow();
        User admin =
                userRepository.findByEmailAndIsDeletedFalse("admin@test.com").orElseThrow();

        followService.follow(admin.getId(), stranger.getId());

        Post normalPost = Post.builder()
                .user(stranger)
                .title("가중치 없는 일반 게시글")
                .content("이제 admin의 팔로우 피드에 자연스럽게 노출됩니다.")
                .build();

        postRepository.save(normalPost);

        feedService.registerPostToGlobalFeed(normalPost);
        feedService.deliverPostToFeeds(normalPost);
    }

    private void createTechInterestScenario() {
        User user1 =
                userRepository.findByEmailAndIsDeletedFalse("user1@test.com").orElseThrow();
        User user2 =
                userRepository.findByEmailAndIsDeletedFalse("user2@test.com").orElseThrow();
        User author =
                userRepository.findByEmailAndIsDeletedFalse("user5@test.com").orElseThrow();

        Technology java = technologyRepository.findById(1L).orElseThrow();
        Technology spring = technologyRepository.findById(2L).orElseThrow();
        Technology aws = technologyRepository.findById(4L).orElseThrow();
        Technology docker = technologyRepository.findById(5L).orElseThrow();

        for (int i = 0; i < 30; i++) {
            // user1: Java, Spring Boot (Backend)
            techScoreService.increaseScore(user1, java, "POST");
            techScoreService.increaseScore(user1, spring, "POST");

            // user2: AWS, Docker (Infra)
            techScoreService.increaseScore(user2, aws, "POST");
            techScoreService.increaseScore(user2, docker, "POST");
        }

        Post javaPost = Post.builder()
                .user(author)
                .title("2026년 Java 백엔드 로드맵")
                .content("Java/Spring 중심")
                .build();
        addTagToPost(javaPost, java);
        postRepository.save(javaPost);
        feedService.registerPostToGlobalFeed(javaPost);
        feedService.deliverPostToFeeds(javaPost);

        Post infraPost = Post.builder()
                .user(author)
                .title("AWS와 Docker를 활용한 CI/CD")
                .content("인프라 중심")
                .build();
        addTagToPost(infraPost, aws);
        postRepository.save(infraPost);
        feedService.registerPostToGlobalFeed(infraPost);
        feedService.deliverPostToFeeds(infraPost);
    }

    private void boostPostToGlobalTop(Long postId) {
        String postIdStr = String.valueOf(postId);
        double superScore = 100_000_000_000.0;

        redisTemplate.opsForZSet().add("posts:global:scores", postIdStr, superScore);
        System.out.println(">>> [SUCCESS] ID " + postId + "번 게시글을 글로벌 전역 1등으로 설정했습니다.");
    }
}
