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
  /** 백엔드 피드: 본인 행(스토리 바 첫 칸과 동일 사용자) */
  isMe?: boolean;
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
  /** 동영상 등 썸네일 URL (선택) */
  thumbnailUrl?: string;
}

export interface StoryCreateResponse {
  storyId: number;
  userId: number;
  /** 백엔드 응답에 없을 수 있음 — 없으면 공유 링크용 시각은 클라이언트에서 보정 */
  createdAt?: string;
  mediaUrl?: string;
}
