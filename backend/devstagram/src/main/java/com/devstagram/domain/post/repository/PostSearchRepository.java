package com.devstagram.domain.post.repository;

import com.devstagram.domain.post.entity.PostDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface PostSearchRepository extends ElasticsearchRepository<PostDocument, Long> {
    List<PostDocument> findByTitleOrContent(String title, String content);
}