// src/api/user.ts
import client from './client';
import { RsData } from '../types/common';
import { FollowUserResponse, FollowResponse } from '../types/user';

export const userApi = {
  // 팔로우 실행
  follow: (toUserId: number) => 
    client.post<RsData<FollowResponse>>(`/follows/${toUserId}`).then(res => res.data),

  // 팔로우 취소
  unfollow: (toUserId: number) => 
    client.delete<RsData<FollowResponse>>(`/follows/${toUserId}`).then(res => res.data),

  // 팔로워 수 조회
  getFollowerCount: (userId: number) => 
    client.get<RsData<number>>(`/follows/${userId}/follower-count`).then(res => res.data),

  // 팔로잉 수 조회
  getFollowingCount: (userId: number) => 
    client.get<RsData<number>>(`/follows/${userId}/following-count`).then(res => res.data),

  // 팔로잉 목록 조회
  getFollowings: (userId: number) => 
    client.get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followings`).then(res => res.data),

  // 팔로워 목록 조회
  getFollowers: (userId: number) => 
    client.get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followers`).then(res => res.data),

  // 팔로우 여부 확인
  isFollowing: (toUserId: number) => 
    client.get<RsData<boolean>>(`/follows/${toUserId}/status`).then(res => res.data),
};
