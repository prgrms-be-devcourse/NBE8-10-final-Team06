package com.devstagram.domain.user.repository;

import com.devstagram.domain.user.entity.UserDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface UserSearchRepository extends ElasticsearchRepository<UserDocument, Long> {
    List<UserDocument> findByNicknameAndIsDeletedFalse(String nickname);
}