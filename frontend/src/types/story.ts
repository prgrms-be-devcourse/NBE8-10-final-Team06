import { MediaType } from './post';

/** 백엔드 `StoryViewerUserResponse`와 동일 필드. `isLiked`·시각 필드는 목록 외 낙관적 갱신 등에서 생략 가능 */
export interface StoryViewerUserResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  isLiked?: boolean;
  viewedAt?: string;
  likedAt?: string | null;
}

export interface StoryFeedResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  isUnread: boolean;
  totalStoryCount: number;
  lastUpdatedAt: string;
}

export interface StoryDetailResponse {
  storyId: number;
  userId: number;
  createdAt: string;
  expiredAt: string;
  content: string;
  mediaUrl: string;
  mediaType: MediaType;
  taggedUserIds: number[];
  totalLikeCount: number;
  isLiked: boolean;
  /** 작성자 본인 조회 시에만 채워짐; 그 외에는 null */
  viewers: StoryViewerUserResponse[] | null;
  /** 작성자 본인 조회 시에만 채워짐; 그 외에는 null */
  likers: StoryViewerUserResponse[] | null;
}

export interface StoryViewResponse {
  storyId: number;
  userId: number;
  totalLikeCount: number;
  isLiked: boolean;
  viewedAt: string;
  likedAt: string | null;
}

export interface StoryCreateRequest {
  content?: string;
  file: File;
  mediaType: MediaType;
  tagUserIds?: number[];
}

export interface StoryCreateResponse {
  storyId: number;
  userId: number;
  mediaUrl: string;
}
