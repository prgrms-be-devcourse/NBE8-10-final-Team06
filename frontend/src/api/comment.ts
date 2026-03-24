import client from './client';
import { CommentInfoResponse, ReplyInfoResponse, CommentCreateRequest, CommentUpdateRequest } from '../types/comment';
import { RsData } from '../types/common';
import { Slice } from '../types/post';

export const commentApi = {
  // 게시물 댓글 조회 (Slice)
  getComments: async (postId: number, pageNumber = 0): Promise<RsData<Slice<CommentInfoResponse>>> => {
    const res = await client.get<RsData<Slice<CommentInfoResponse>>>(`/posts/${postId}/comments`, {
      params: { pageNumber },
    });
    return res.data;
  },

  // 댓글의 대댓글 조회 (Slice)
  getReplies: async (commentId: number, pageNumber = 0): Promise<RsData<Slice<ReplyInfoResponse>>> => {
    const res = await client.get<RsData<Slice<ReplyInfoResponse>>>(`/comments/${commentId}/replies`, {
      params: { pageNumber },
    });
    return res.data;
  },

  // 댓글 작성
  createComment: async (postId: number, data: CommentCreateRequest): Promise<RsData<number>> => {
    const res = await client.post<RsData<number>>(`/posts/${postId}/comments`, data);
    return res.data;
  },

  // 댓글 수정
  updateComment: async (commentId: number, data: CommentUpdateRequest): Promise<RsData<void>> => {
    const res = await client.put<RsData<void>>(`/comments/${commentId}`, data);
    return res.data;
  },

  // 댓글 삭제
  deleteComment: async (commentId: number): Promise<RsData<void>> => {
    const res = await client.delete<RsData<void>>(`/comments/${commentId}`);
    return res.data;
  },

  // 댓글 좋아요 토글
  toggleLike: async (commentId: number): Promise<RsData<void>> => {
    const res = await client.post<RsData<void>>(`/comments/${commentId}`);
    return res.data;
  },
};
