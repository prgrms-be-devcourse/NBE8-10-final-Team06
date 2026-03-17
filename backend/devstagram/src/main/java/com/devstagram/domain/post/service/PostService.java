package com.devstagram.domain.post.service;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devstagram.domain.post.dto.PostCreateReq;
import com.devstagram.domain.post.dto.PostDetailRes;
import com.devstagram.domain.post.dto.PostFeedRes;
import com.devstagram.domain.post.dto.PostUpdateReq;
import com.devstagram.domain.post.entity.Post;
import com.devstagram.domain.post.repository.PostRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;

    @Transactional(readOnly = true)
    public Slice<PostFeedRes> getPostFeed(Pageable pageable) {
        return postRepository.findAllByOrderByCreatedAtDesc(pageable).map(PostFeedRes::from);
    }

    @Transactional(readOnly = true)
    public PostDetailRes getPostDetail(Long id) {
        Post post = postRepository.findById(id).orElse(null);
        return PostDetailRes.from(post);
    }

    @Transactional
    public Long createPost(PostCreateReq req) {

        Post post = Post.builder().title(req.title()).content(req.content()).build();

        post = postRepository.save(post);

        return post.getId();
    }

    @Transactional
    public void updatePost(Long postId, PostUpdateReq req) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("해당 게시글이 존재하지 않습니다. ID: " + postId));

        post.update(req.title(), req.content());
    }

    @Transactional
    public void deletePost(Long postId) {

        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("해당 게시글이 존재하지 않습니다. ID: " + postId);
        }

        postRepository.deleteById(postId);
    }
}
