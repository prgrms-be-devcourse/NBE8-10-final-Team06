// src/types/user.ts

export interface FollowUserResponse {
  id: number;
  nickname: string;
  email: string;
  profileImageUrl: string | null;
}

export interface FollowResponse {
  toUserId: number;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}
