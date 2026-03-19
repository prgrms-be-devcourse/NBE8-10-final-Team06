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
        return userRepository.findById(id).orElseThrow(() -> new ServiceException("404-U-1", "존재하지 않는 사용자입니다."));
    }

    /**
     * [주의] API Key가 해싱되어 저장되므로,
     * 단순 findByApiKey(apiKey) 쿼리로는 유저를 찾을 수 없습니다.
     * 이 메서드는 나중에 '식별자'를 통해 유저를 찾고 passwordEncoder.matches()로 검증하는 로직으로 변경되어야 합니다.
     * 지금은 컴파일 에러 방지를 위해 기존 구조를 유지하되, 로직상 동작하지 않음을 인지해야 합니다.
     */
    public User findByApiKey(String apiKey) {
        return userRepository
                .findByApiKey(apiKey) // DB에 해싱된 값이 들어있어서 원본 apiKey로는 검색 실패함
                .orElseThrow(() -> new ServiceException("401-U-1", "유효하지 않은 API Key입니다."));
    }

    public SecurityUser toSecurityUser(User user) {
        return new SecurityUser(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getApiKey(), // 여기에는 DB에 저장된 해싱된 값이 들어갑니다.
                user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    public SignupResponse getMyInfo(Long id) {
        User user = findById(id);
        return SignupResponse.from(user);
    }
}
