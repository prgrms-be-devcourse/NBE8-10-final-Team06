package com.devstagram.domain.post.service;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.devstagram.domain.post.entity.PostDocument;
import com.devstagram.domain.post.repository.PostSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostSearchService {

    private final PostSearchRepository postSearchRepository;
    private final ElasticsearchOperations elasticsearchOperations;

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

    // 기술태그 필터 검색 (matchAll=true: AND, matchAll=false: OR)
    public List<PostDocument> searchByTags(List<String> tagNames, boolean matchAll) {
        if (matchAll) {
            return searchByTagsAnd(tagNames);
        }
        return postSearchRepository.findByTagsIn(tagNames);
    }

    // AND: 선택한 태그를 모두 포함한 게시글
    private List<PostDocument> searchByTagsAnd(List<String> tagNames) {
        List<Query> mustClauses = tagNames.stream()
                .map(tag -> Query.of(q -> q.term(t -> t.field("tags").value(tag))))
                .toList();

        Query boolQuery = Query.of(q -> q.bool(b -> b.must(mustClauses)));
        NativeQuery query = NativeQuery.builder().withQuery(boolQuery).build();
        SearchHits<PostDocument> hits = elasticsearchOperations.search(query, PostDocument.class);

        return hits.stream()
                .map(hit -> hit.getContent())
                .toList();
    }
}