package com.devstagram.domain.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.post.entity.PostMedia;

public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {}
