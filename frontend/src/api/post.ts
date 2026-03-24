import client from './client';
import { PostFeedResponse, Slice, PostCreateRequest, PostDetailResponse } from '../types/post';
import { RsData } from '../types/common';

export const postApi = {
  // 홈 피드 조회 (Slice 페이징)
  getFeed: async (page = 0, size = 10): Promise<RsData<Slice<PostFeedResponse>>> => {
    const res = await client.get<RsData<Slice<PostFeedResponse>>>(`/posts`, {
      params: { page, size, sort: 'createdAt,desc' },
    });
    return res.data;
  },

  // 게시물 상세 조회
  getPost: async (postId: number): Promise<RsData<PostDetailResponse>> => {
    const res = await client.get<RsData<PostDetailResponse>>(`/posts/${postId}`);
    return res.data;
  },

  // 게시물 생성 (MultipartForm)
  createPost: async (data: PostCreateRequest, files: File[]): Promise<RsData<number>> => {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    files.forEach((file) => formData.append('files', file));

    const res = await client.post<RsData<number>>(`/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // 좋아요 토글
  toggleLike: async (postId: number): Promise<RsData<void>> => {
    const res = await client.post<RsData<void>>(`/posts/${postId}`);
    return res.data;
  },

  // 게시물 삭제
  deletePost: async (postId: number): Promise<RsData<void>> => {
    const res = await client.delete<RsData<void>>(`/posts/${postId}`);
    return res.data;
  },
};
