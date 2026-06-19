package com.devstagram.domain.post.service;

import com.devstagram.domain.post.entity.PostDocument;
import com.devstagram.domain.post.repository.PostSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PostSearchService {

    private final PostSearchRepository postSearchRepository;

    // ES에 게시글 색인
    public void index(PostDocument postDocument) {
        postSearchRepository.save(postDocument);
    }

    // ES에서 게시글 삭제
    public void delete(Long postId) {
        postSearchRepository.deleteById(postId);
    }

    // 제목/본문 검색
    public Iterable<PostDocument> search(String keyword) {
        return postSearchRepository.findByTitleOrContent(keyword, keyword);
    }
}