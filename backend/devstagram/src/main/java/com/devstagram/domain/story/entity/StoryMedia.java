package com.devstagram.domain.story.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import com.devstagram.global.enumtype.MediaType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "story_media")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class StoryMedia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    MediaType mediaType; // 이미지, 동영상

    @Column(nullable = false)
    String sourceUrl;
}
