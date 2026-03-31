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
  likeCount: number; // 추가
}

/**
 * com.devstagram.domain.comment.dto.ReplyInfoRes
 */
export interface ReplyInfoResponse {
  id: number;
  userId: number;
  content: string;
  nickname: string;
  isLiked: boolean;
  isMine: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  modifiedAt: string;
  likeCount: number; // 추가
}

export interface CommentCreateRequest {
  content: string;
  parentCommentId?: number | null; // 추가
}

export interface CommentUpdateRequest {
  content: string;
}
