package com.devstagram.domain.post.controller;

import com.devstagram.domain.post.dto.PostSearchRes;
import com.devstagram.domain.post.entity.PostDocument;
import com.devstagram.domain.post.service.PostSearchService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/posts/search")
@RequiredArgsConstructor
public class PostSearchController {

    private final PostSearchService postSearchService;

    @GetMapping
    public List<PostSearchRes> search(@RequestParam String keyword) {
        Iterable<PostDocument> result = postSearchService.search(keyword);

        return StreamSupport.stream(result.spliterator(), false)
                .map(PostSearchRes::from)
                .toList();
    }

    // 기술태그 필터 검색
    // matchAll=false (기본): 선택한 태그 중 하나라도 포함된 게시글 (OR)
    // matchAll=true: 선택한 태그를 모두 포함한 게시글 (AND)
    @GetMapping("/by-tags")
    public List<PostSearchRes> searchByTags(
            @RequestParam List<String> tags,
            @RequestParam(defaultValue = "false") boolean matchAll) {

        return postSearchService.searchByTags(tags, matchAll)
                .stream()
                .map(PostSearchRes::from)
                .toList();
    }
}