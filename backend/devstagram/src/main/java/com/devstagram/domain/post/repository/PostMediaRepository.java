package com.devstagram.domain.post.repository;

import com.devstagram.domain.post.entity.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {
}