package com.devstagram.global.initData;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;

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
import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.AuthService;
import com.devstagram.domain.user.service.FollowService;
import com.devstagram.global.enumtype.MediaType;

import lombok.RequiredArgsConstructor;

/**
 * 프론트엔드 개발 및 DM/스토리 공유 테스트를 위해 정교화된 데이터를 생성하는 클래스입니다.
 */
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (userRepository.count() > 0) return;

        initData();
    }

    private void initData() {
        createUsers();
        createFollows();
        createPosts();
        createStories();
        createInteractions();
        createDms();
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
        User admin = userRepository.findByEmail("admin@test.com").get();
        User user1 = userRepository.findByEmail("user1@test.com").get();
        User user2 = userRepository.findByEmail("user2@test.com").get();
        User user3 = userRepository.findByEmail("user3@test.com").get();

        followService.follow(admin.getId(), user1.getId());
        followService.follow(admin.getId(), user2.getId());
        followService.follow(admin.getId(), user3.getId());
        followService.follow(user1.getId(), admin.getId());
        followService.follow(user2.getId(), admin.getId());
        followService.follow(user3.getId(), admin.getId());
        followService.follow(user1.getId(), user2.getId());
        followService.follow(user2.getId(), user1.getId());
    }

    private void createPosts() {
        String[] titles = {"안녕하세요!", "스프링 부트 공부 중", "오늘의 날씨", "맛있는 점심", "코딩은 즐거워", "퇴근하고 싶다"};
        String[] contents = {
            "반갑습니다. 데브스타그램입니다.",
            "JPA 연관관계 매핑이 어렵네요.",
            "구름 한 점 없는 맑은 날씨입니다.",
            "오늘은 돈까스를 먹었습니다.",
            "버그 잡는 맛에 코딩하죠.",
            "월요일 아침부터 퇴근 생각뿐..."
        };
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
        User admin = userRepository.findByEmail("admin@test.com").get();
        User user1 = userRepository.findByEmail("user1@test.com").get();

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
                    post.getId(), users.get(0).getId(), new CommentCreateReq("정말 멋지네요!", null));
            commentService.createComment(post.getId(), users.get(1).getId(), new CommentCreateReq("동감합니다!", commentId));

            if (i == 0) {
                commentService.createComment(post.getId(), users.get(2).getId(), new CommentCreateReq("와우!", null));
            }
        }
    }

    private void createDms() {
        User admin = userRepository.findByEmail("admin@test.com").get();
        User user1 = userRepository.findByEmail("user1@test.com").get();
        User user2 = userRepository.findByEmail("user2@test.com").get();

        Post samplePost = postRepository.findAll().get(0);
        Story sampleStory = storyRepository.findAll().get(0);

        // 1. 1:1 DM 방 (admin <-> user1)
        DmRoom room1v1 = DmRoom.create1v1Room(user1.getNickname());
        dmRoomRepository.save(room1v1);
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(room1v1, user1, new Date()));

        dmRepository.save(Dm.create(room1v1, admin, MessageType.TEXT, "안녕하세요 user1님!", null, true));
        dmRepository.save(Dm.create(room1v1, user1, MessageType.TEXT, "네 안녕하세요 admin님!", null, true));

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
        DmRoom groupRoom = DmRoom.createGroupRoom("데브스타그램 개발팀");
        dmRoomRepository.save(groupRoom);
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, admin, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user1, new Date()));
        dmRoomUserRepository.save(DmRoomUser.create(groupRoom, user2, new Date()));

        dmRepository.save(Dm.create(groupRoom, admin, MessageType.TEXT, "팀원 여러분 반갑습니다!", null, true));
        dmRepository.save(Dm.create(groupRoom, user1, MessageType.TEXT, "공유해주신 게시글 잘 봤습니다!", null, true));
    }
}
