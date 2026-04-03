import client from './client';
import { RsData, Slice, Page } from '../types/common';
import { appendJsonRequestPart, appendFileParts } from '../util/formDataParts';
import { 
  PostFeedResponse, 
  PostDetailResponse, 
  PostCreateRequest, 
  PostUpdateRequest,
  PostLikerResponse
} from '../types/post';

export const postApi = {
  create: (req: PostCreateRequest, files: File[] = []) => {
    const formData = new FormData();
    appendJsonRequestPart(formData, req);
    if (files.length > 0) appendFileParts(formData, files);
    return client.post<RsData<number>>('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  /** Spring Pageable: page, size, sort — 컨트롤러 @PageableDefault(createdAt DESC) 와 동일하게 명시 */
  getFeed: (page: number = 0, size: number = 10) =>
    client.get<RsData<Slice<PostFeedResponse>>>('/posts', {
      params: { page, size, sort: 'createdAt,desc' },
    }).then((res) => res.data),

  getDetail: (postId: number, pageNumber: number = 0) =>
    client.get<RsData<PostDetailResponse>>(`/posts/${postId}`, {
      params: { pageNumber }
    }).then(res => res.data),

  update: (postId: number, req: PostUpdateRequest, files?: File[]) => {
    const formData = new FormData();
    appendJsonRequestPart(formData, req);
    if (files) appendFileParts(formData, files);
    return client.put<RsData<void>>(`/posts/${postId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  delete: (postId: number) =>
    client.delete<RsData<void>>(`/posts/${postId}`).then(res => res.data),

  toggleLike: (postId: number) =>
    client.post<RsData<void>>(`/posts/${postId}/like`).then(res => res.data),

  toggleScrap: (postId: number) =>
    client.post<RsData<void>>(`/posts/${postId}/scrap`).then(res => res.data),

  getScraps: (page: number = 0, size: number = 10) =>
    client.get<RsData<Page<PostFeedResponse>>>('/posts/scraps', {
      params: { page, size },
    }).then((res) => res.data),

  // 특정 포스트 좋아요 유저 목록 조회
  getLikers: (postId: number, page: number = 0, size: number = 20) =>
    client.get<RsData<Slice<PostLikerResponse>>>(`/posts/${postId}/likers`, {
      params: { page, size }
    }).then(res => res.data),
};
