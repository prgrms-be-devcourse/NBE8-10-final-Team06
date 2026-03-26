package com.devstagram.global.initData;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.devstagram.domain.feed.service.FeedService;
import com.devstagram.domain.technology.service.TechScoreService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
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
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.domain.technology.repository.TechnologyRepository;
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
@Profile("dev")
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
    private final FeedService feedService;
    private final TechScoreService techScoreService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (userRepository.count() > 0) return;

        initData();
    }

    private void initData() {
        createTechMasterData();
        createUsers();
        createFollows();
        createPosts();
        createStories();
        createInteractions();
        createDms();
        createFeedScoringScenario();
        createNormalPost();
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
        String[] nicknames = {"admin", "user1", "user2", "user3", "user4", "user5"};
        String[] emails = {
            "admin@test.com", "user1@test.com", "user2@test.com", "user3@test.com", "user4@test.com", "user5@test.com"
        };
        Resume[] resumes = {
            Resume.SENIOR, Resume.JUNIOR, Resume.UNDERGRADUATE, Resume.INTERMEDIATE, Resume.JUNIOR, Resume.UNDERGRADUATE
        };

        for (int i = 0; i < nicknames.length; i++) {
            authService.signup(new SignupRequest(
                    nicknames[i],
                    emails[i],
                    "password123",
                    LocalDate.of(1990 + i, (i % 12) + 1, (i % 28) + 1),
                    i % 2 == 0 ? Gender.MALE : Gender.FEMALE,
                    "https://github.com/" + nicknames[i],
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

    private void createFeedScoringScenario() {
        // 1. 유저 확보
        User admin = userRepository.findByEmail("admin@test.com").get(); // 나 (피드 조회 주체)
        User user4 = userRepository.findByEmail("user4@test.com").get(); // 팔로우 안 함, 기술 일치 안 함
        User user5 = userRepository.findByEmail("user5@test.com").get(); // 팔로우 안 함, 기술 일치 안 함

        Technology java = technologyRepository.findAll().stream()
                .filter(t -> t.getName().equals("Java")).findFirst().get();

        // 2. [조건 A: 기술 관심사] admin에게 Java 점수 부여 (60점 -> 기준 50점 초과)
        // admin이 Java 글을 3번 썼다고 가정 (POST 가중치 20점 * 3)
        for (int i = 0; i < 3; i++) {
            techScoreService.increaseScore(admin, java, "POST");
        }

        // 3. 테스트용 게시글 3개 생성 (작성 시간은 거의 동일하게)

        // [게시글 1] 일반인(user4)이 쓴 아무 관련 없는 글 -> 점수 보너스 없음 (Base Score만 가짐)
        Post normalPost = postRepository.save(Post.builder()
                .user(user4).title("점수 보너스 없는 일반글").content("조금 뒤에 밀려날 운명").build());

        // [게시글 2] 내가 팔로우한 user1이 쓴 글 -> 팔로우 보너스 (+12시간)
        User user1 = userRepository.findByEmail("user1@test.com").get();
        Post followPost = postRepository.save(Post.builder()
                .user(user1).title("팔로우 보너스 적용글").content("내 친구의 소식").build());

        // [게시글 3] 팔로우 안 한 user5가 쓴 'Java' 관련 글 -> 기술 보너스 (+24시간)
        Post techPost = Post.builder()
                .user(user5).title("기술 보너스 적용글").content("Java 신기술 정보").build();
        addTagToPost(techPost, java);
        postRepository.save(techPost);

        // 4. Redis 배달 강제 트리거 (테스트 환경에 따라 PostService.createPost를 거치지 않고 저장했다면 명시적 호출 필요)
        // postService.createPost 로직을 사용했다면 자동 배달되겠지만,
        // 직접 save했다면 feedService.deliverPostToFeeds를 여기서 호출해줍니다.
        feedService.deliverPostToFeeds(normalPost, List.of(admin));
        feedService.deliverPostToFeeds(followPost, List.of(admin));
        feedService.deliverPostToFeeds(techPost, List.of(admin));
    }

    private void createNormalPost() {
        // 1. 나와 관계없는 유저 선택 (user4는 admin이 팔로우 안 함)
        User stranger = userRepository.findByEmail("user4@test.com").orElseThrow();

        // 2. 태그가 아예 없는 '순수 일반글' 생성
        Post normalPost = Post.builder()
                .user(stranger)
                .title("가중치 없는 일반 게시글")
                .content("이 글은 팔로우 보너스도, 기술 보너스도 없습니다.")
                .build();

        postRepository.save(normalPost);

        // 3. 미디어 추가 (선택사항)
        postMediaRepository.save(PostMedia.builder()
                .post(normalPost)
                .sourceUrl("https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800")
                .mediaType(MediaType.jpg)
                .sequence((short) 1)
                .build());

        // 4. [중요] Redis 배달 (admin에게만 배달하여 테스트)
        User admin = userRepository.findByEmail("admin@test.com").orElseThrow();
        feedService.deliverPostToFeeds(normalPost, List.of(admin));
    }
}
