package com.devstagram.domain.user.service;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.user.dto.SignupResponse;
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
        return userRepository.findById(id).orElseThrow(() -> new ServiceException("404-F-1", "존재하지 않는 사용자입니다."));
    }

    public User findByApiKey(String apiKey) {
        return userRepository
                .findByApiKey(apiKey)
                .orElseThrow(() -> new ServiceException("401-F-1", "유효하지 않은 API Key입니다."));
    }

    public SecurityUser toSecurityUser(User user) {
        return new SecurityUser(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getApiKey(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    public SignupResponse getMyInfo(Long id) {
        User user = findById(id);
        return SignupResponse.from(user);
    }
}
