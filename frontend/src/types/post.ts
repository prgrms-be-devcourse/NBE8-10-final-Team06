import { Slice } from './common';
import { CommentInfoResponse } from './comment';

/**
 * com.devstagram.global.enumtype.MediaType
 */
export type MediaType = 'jpg' | 'jpeg' | 'gif' | 'png' | 'webp' | 'mp4' | 'webm' | 'mov';

/**
 * com.devstagram.domain.post.dto.PostMediaRes
 */
export interface PostMediaResponse {
  id: number;
  sourceUrl: string;
  sequence: number;
  mediaType: MediaType;
}

/**
 * com.devstagram.domain.technology.dto.TechTagRes
 */
export interface TechTagRes {
  id: number;
  name: string;
  color: string;
}

/**
 * com.devstagram.domain.post.dto.PostFeedProfileRes
 */
export interface PostFeedProfileRes {
  id: number;
  /** 프로필 그리드 썸네일용; 구 API에 없을 수 있음 */
  title?: string;
  medias: PostMediaResponse[];
  techStacks: TechTagRes[];
  likeCount: number;
  commentCount: number;
}

/**
 * com.devstagram.domain.post.dto.PostFeedRes
 */
export interface PostFeedResponse {
  id: number;
  authorId: number;
  nickname: string;
  title: string;
  content: string;
  medias: PostMediaResponse[];
  techStacks: TechTagRes[];
  isLiked: boolean;
  isScrapped: boolean;
  isMine: boolean;
  profileImageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  /** 추천 피드 스코어 (백엔드 PostFeedRes) */
  feedScore?: number;
}

/**
 * com.devstagram.domain.post.dto.PostDetailRes
 */
export interface PostDetailResponse {
  id: number;
  authorId: number;
  nickname: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isScrapped: boolean;
  isMine: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  medias: PostMediaResponse[];
  techStacks: TechTagRes[];
  comments: Slice<CommentInfoResponse>;
}

/**
 * com.devstagram.domain.post.dto.PostCreateReq
 */
export interface PostCreateRequest {
  title: string;
  content: string;
  techIds: number[];
}

/**
 * com.devstagram.domain.post.dto.PostUpdateReq
 */
export interface PostUpdateRequest {
  title: string;
  content: string;
  techIds: number[];
}

/**
 * com.devstagram.domain.post.dto.PostLikerRes
 */
export interface PostLikerResponse {
  userId: number;
  nickname: string;
}
