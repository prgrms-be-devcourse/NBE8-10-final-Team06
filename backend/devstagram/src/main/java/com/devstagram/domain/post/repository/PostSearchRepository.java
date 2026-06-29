package com.devstagram.domain.post.repository;

import com.devstagram.domain.post.entity.PostDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface PostSearchRepository extends ElasticsearchRepository<PostDocument, Long> {
    List<PostDocument> findByTitleOrContent(String title, String content);

    // OR 조건: 선택한 태그 중 하나라도 포함된 게시글
    List<PostDocument> findByTagsIn(List<String> tags);
}