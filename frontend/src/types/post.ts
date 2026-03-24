import { CommentInfoResponse } from './comment';

export type MediaType = 'jpg' | 'jpeg' | 'gif' | 'png' | 'webp' | 'mp4' | 'webm' | 'mov';

export interface PostMediaResponse {
  id: number;
  sourceUrl: string;
  sequence: number;
  mediaType: MediaType;
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

/**
 * Spring Data Slice 객체 구조
 */
export interface Slice<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PostCreateRequest {
  title: string;
  content: string;
}

export interface PostUpdateRequest {
  title: string;
  content: string;
}
