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
}