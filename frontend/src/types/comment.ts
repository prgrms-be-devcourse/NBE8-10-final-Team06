export interface CommentInfoResponse {
  id: number;
  userId: number;
  content: string;
  nickname: string;
  createdAt: string;
  modifiedAt: string;
  replyCount: number;
}

export interface ReplyInfoResponse {
  id: number;
  userId: number;
  content: string;
  nickname: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CommentCreateRequest {
  content: string;
}

export interface CommentUpdateRequest {
  content: string;
}
