package com.devstagram.domain.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {}
