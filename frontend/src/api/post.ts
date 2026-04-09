import axios from 'axios';
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

export type DeletePostResult = 'deleted' | 'alreadyDeleted';

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

  /**
   * 백엔드 soft-delete 정책 대응:
   * - 200-S-*  : 정상 삭제
   * - 404-P-2 : 이미 삭제된 게시글(멱등 삭제로 간주)
   */
  deleteSafe: async (postId: number): Promise<DeletePostResult> => {
    try {
      const res = await client.delete<RsData<void>>(`/posts/${postId}`);
      if (res.data.resultCode?.includes('-S-') || res.data.resultCode?.startsWith('200')) {
        return 'deleted';
      }
      throw new Error(res.data.msg || '삭제 실패');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as { resultCode?: unknown } | undefined;
        const code = typeof data?.resultCode === 'string' ? data.resultCode : '';
        if (status === 404 && code === '404-P-2') {
          return 'alreadyDeleted';
        }
      }
      throw err;
    }
  },

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
