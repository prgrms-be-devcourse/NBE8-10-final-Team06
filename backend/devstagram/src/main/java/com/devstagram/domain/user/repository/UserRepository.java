package com.devstagram.domain.user.repository;

import com.devstagram.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // 이메일로 유저를 찾는 기능 (로그인 시 필요)
    Optional<User> findByEmail(String email);

    // 이메일 중복 확인 기능
    boolean existsByEmail(String email);
}