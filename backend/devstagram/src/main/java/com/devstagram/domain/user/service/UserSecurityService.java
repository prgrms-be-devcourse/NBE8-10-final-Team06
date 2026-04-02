package com.devstagram.domain.user.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.MyInfoResponse;
import com.devstagram.domain.user.entity.User;
import com.devstagram.domain.user.repository.UserRepository;
import com.devstagram.global.exception.ServiceException;
import com.devstagram.global.security.SecurityUser;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserSecurityService {

    private final UserRepository userRepository;

    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));
    }

    public SecurityUser toSecurityUser(User user) {
        // 관리자인지, 일반 유저인지 판별하는 로직 추가
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        if ("admin@test.com".equalsIgnoreCase(user.getEmail())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        return new SecurityUser(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getApiKey(), // 여기에는 DB에 저장된 해싱된 값이 들어갑니다.
                user.getPassword(),
                authorities);
    }

    public MyInfoResponse getMyInfo(Long id) {
        User user = findById(id);
        return MyInfoResponse.from(user);
    }
}
