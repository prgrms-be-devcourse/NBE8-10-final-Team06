import { MediaType } from './post';

export interface StoryViewerUserResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
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
  viewers: StoryViewerUserResponse[];
  likers: StoryViewerUserResponse[];
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
