package com.devstagram.domain.post.repository;

import com.devstagram.domain.post.dto.PostLikerRes;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.entity.PostLike;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndMemberId(Long postId, Long memberId);
    void deleteByPostIdAndMemberId(Long postId, Long memberId);


    @Query("SELECT new com.devstagram.domain.post.dto.PostLikerRes(u.nickname) " +
            "FROM PostLike pl " +
            "JOIN pl.user u " +
            "WHERE pl.post.id = :postId")
    Slice<PostLikerRes> findLikersByPostId(@Param("postId") Long postId, Pageable pageable);
}
