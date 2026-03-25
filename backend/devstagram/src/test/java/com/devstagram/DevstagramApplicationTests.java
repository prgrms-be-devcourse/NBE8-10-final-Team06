package com.devstagram;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
class DevstagramApplicationTests {

    @Test
    void contextLoads() {
        assertThat(SpringBootTest.class).isNotNull();
    }
}
