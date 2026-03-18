package com.devstagram.domain.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.user.entity.UserInfo;

@Repository
public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {}
