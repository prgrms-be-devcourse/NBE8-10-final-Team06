// src/types/story.ts
export type MediaType = 'jpg' | 'jpeg' | 'gif' | 'png' | 'webp' | 'mp4' | 'webm' | 'mov';

export interface StoryViewerUserResponse {
  userId: number;
  nickname: string;
  isLiked: boolean;
  viewedAt: string; // LocalDateTime (ISO 8601)
  likedAt: string | null; // LocalDateTime (ISO 8601)
}

export interface StoryDetailResponse {
  storyId: number;
  userId: number;
  createdAt: string;
  expiredAt: string;
  content: string;
  tagedUserIds: number[]; // 백엔드 DTO 오타 반영 (taged)
  totalLikeCount: number;
  isLiked: boolean;
  viewers: StoryViewerUserResponse[] | null; // 작성자 전용
  likers: StoryViewerUserResponse[] | null; // 작성자 전용
}

export interface StoryFeedResponse {
  userId: number;
  nickname: string;
  isUnread: boolean;
  lastUpdatedAt: string;
}

export interface StoryCreateRequest {
  content?: string;
  tagUserIds?: number[];
  mediaType: MediaType;
  file: File;
  thumbnailUrl?: string;
}

export interface StoryCreateResponse {
  storyId: number;
  userId: number;
  createdAt: string;
  expiredAt: string;
  content: string;
  taggedUserIds: number[]; // 여기는 g가 두 개 (tagged)
}

export interface StoryViewResponse {
  storyId: number;
  userId: number;
  totalLikeCount: number;
  isLiked: boolean;
  viewedAt: string;
  likedAt: string | null;
}
