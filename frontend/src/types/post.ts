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
  medias: PostMediaResponse[];
  techStacks: TechTagRes[];
  likeCount: number;
  commentCount: number;
}

export interface PostFeedResponse {
  id: number;
  authorId: number;
  nickname: string;
  title: string;
  content: string;
  medias: PostMediaResponse[];
  likeCount: number;
  commentCount: number;
  createdAt: string; // ISO 8601 string
}

export interface PostDetailResponse {
  id: number;
  authorId: number;
  nickname: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  medias: PostMediaResponse[];
  comments: Slice<CommentInfoResponse>;
}

export interface PostCreateRequest {
  title: string;
  content: string;
}

export interface PostUpdateRequest {
  title: string;
  content: string;
}
