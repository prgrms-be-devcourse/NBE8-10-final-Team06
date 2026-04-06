package com.devstagram.global.initData;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.SignupRequest;
import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.domain.user.service.AuthService;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class K6TestUserInitData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(K6TestUserInitData.class);
    private static final String K6_PASSWORD = "Test1234Pw";

    private final AuthService authService;
    private final UserRepository userRepository;

    @Value("${custom.init.k6-users:false}")
    private boolean initK6Users;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!initK6Users) {
            log.info("K6 테스트 계정 생성 스킵: custom.init.k6-users=false");
            return;
        }

        int createdCount = 0;

        for (int i = 1; i <= 150; i++) {
            String num = String.format("%03d", i);
            String nickname = "k6test" + num;
            String email = "k6test" + num + "@devstagram.com";

            if (userRepository.findByEmailAndIsDeletedFalse(email).isPresent()) {
                continue;
            }

            authService.signup(new SignupRequest(
                    nickname,
                    email,
                    K6_PASSWORD,
                    LocalDate.of(1995, 1, (i % 28) + 1),
                    i % 2 == 0 ? Gender.MALE : Gender.FEMALE,
                    "https://github.com/" + nickname,
                    Resume.JUNIOR));

            createdCount++;
        }

        log.info("K6 테스트 계정 생성 완료: {}개", createdCount);
    }
}
