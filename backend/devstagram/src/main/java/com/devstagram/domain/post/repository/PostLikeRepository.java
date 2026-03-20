package com.devstagram.domain.post.repository;

import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.post.dto.PostLikerRes;
import com.devstagram.domain.post.entity.PostLike;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);

    @Query("SELECT new com.devstagram.domain.post.dto.PostLikerRes(u.id, u.nickname) "
            + "FROM PostLike pl "
            + "JOIN pl.user u "
            + "WHERE pl.post.id = :postId")
    Slice<PostLikerRes> findLikersByPostId(@Param("postId") Long postId, Pageable pageable);
}
