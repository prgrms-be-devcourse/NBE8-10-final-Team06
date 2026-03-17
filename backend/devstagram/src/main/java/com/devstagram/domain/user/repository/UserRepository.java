package com.devstagram.domain.user.repository;

import com.devstagram.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    Optional<User> findByNickname(String nickname);
    Optional<User> findByApiKey(String apiKey);

    boolean existsByEmail(String email);
    boolean existsByNickname(String nickname);
}