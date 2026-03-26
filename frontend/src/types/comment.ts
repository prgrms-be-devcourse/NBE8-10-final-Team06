/**
 * com.devstagram.domain.comment.dto.CommentInfoRes
 */
export interface CommentInfoResponse {
  id: number;
  userId: number;
  content: string;
  nickname: string;
  isLiked: boolean;
  isMine: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  modifiedAt: string;
  replyCount: number;
}

/**
 * com.devstagram.domain.comment.dto.ReplyInfoRes
 */
export interface ReplyInfoResponse {
  id: number;
  userId: number;
  content: string;
  nickname: string;
  isLiked: boolean; // 백엔드 ReplyInfoRes 필드 확인 필요
  isMine: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface CommentCreateRequest {
  content: string;
  parentCommentId?: number | null; // 추가
}

export interface CommentUpdateRequest {
  content: string;
}
