package com.devstagram.domain.user.repository;

import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.user.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByNicknameAndIsDeletedFalse(String nickname);

    Optional<User> findByApiKey(String apiKey);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.followerCount = u.followerCount + 1 WHERE u.id = :id")
    void increaseFollowerCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query(
            "UPDATE User u SET u.followerCount = CASE WHEN u.followerCount > 0 THEN u.followerCount - 1 ELSE 0 END WHERE u.id = :id")
    void decreaseFollowerCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.followingCount = u.followingCount + 1 WHERE u.id = :id")
    void increaseFollowingCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query(
            "UPDATE User u SET u.followingCount = CASE WHEN u.followingCount > 0 THEN u.followingCount - 1 ELSE 0 END WHERE u.id = :id")
    void decreaseFollowingCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.postCount = u.postCount + 1 WHERE u.id = :id")
    void increasePostCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.postCount = CASE WHEN u.postCount > 0 THEN u.postCount - 1 ELSE 0 END WHERE u.id = :id")
    void decreasePostCount(@Param("id") Long id);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.userInfo " + "WHERE u.nickname = :nickname AND u.isDeleted = false")
    Optional<User> findByNicknameWithInfo(@Param("nickname") String nickname);

    @Query("SELECT u FROM User u " + "WHERE u.nickname LIKE %:keyword% AND u.isDeleted = false")
    Slice<User> findByNicknameContaining(@Param("keyword") String keyword, Pageable pageable);
}
