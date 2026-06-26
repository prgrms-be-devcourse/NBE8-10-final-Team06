package com.devstagram.domain.user.service;

import com.devstagram.domain.user.entity.UserDocument;
import com.devstagram.domain.user.repository.UserSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserSearchService {

    private final UserSearchRepository userSearchRepository;

    public void index(UserDocument userDocument) {
        userSearchRepository.save(userDocument);
    }

    public void delete(Long userId) {
        userSearchRepository.deleteById(userId);
    }

    public List<UserDocument> search(String keyword) {
        return userSearchRepository.findByNicknameAndIsDeletedFalse(keyword);
    }
}