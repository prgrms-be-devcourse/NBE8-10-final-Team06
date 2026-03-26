import client from './client';
import { RsData, Slice } from '../types/common';
import { 
  CommentInfoResponse, 
  CommentCreateRequest, 
  CommentUpdateRequest,
  ReplyInfoResponse 
} from '../types/comment';

export const commentApi = {
  // 댓글/답글 작성
  create: (postId: number, req: CommentCreateRequest) =>
    client.post<RsData<number>>(`/posts/${postId}/comments`, req).then(res => res.data),

  // 댓글 수정
  update: (commentId: number, req: CommentUpdateRequest) =>
    client.put<RsData<void>>(`/comments/${commentId}`, req).then(res => res.data),

  // 댓글 삭제
  delete: (commentId: number) =>
    client.delete<RsData<void>>(`/comments/${commentId}`).then(res => res.data),

  // 댓글 좋아요 토글
  toggleLike: (commentId: number) =>
    client.post<RsData<void>>(`/comments/${commentId}`).then(res => res.data),

  // 답글 조회
  getReplies: (commentId: number, page: number = 0) =>
    client.get<RsData<Slice<ReplyInfoResponse>>>(`/comments/${commentId}/replies`, {
      params: { pageNumber: page }
    }).then(res => res.data),
};
