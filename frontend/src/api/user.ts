import client from './client';
import { RsData } from '../types/common';
import { FollowUserResponse, FollowResponse, UserProfileResponse, ProfileUpdateRequest } from '../types/user';

export const userApi = {
  // 특정 사용자의 프로필 조회
  getProfile: (nickname: string, page: number = 0) =>
    client.get<RsData<UserProfileResponse>>(`/users/${nickname}/profile`, {
      params: { page, size: 9 }
    }).then(res => res.data),

  // 내 프로필 정보 수정 (MultipartForm)
  updateProfile: (req: ProfileUpdateRequest, profileImage?: File) => {
    const formData = new FormData();
    
    // 핵심: JSON 데이터를 Blob으로 감싸고 type을 application/json으로 명시해야 백엔드 @RequestPart가 인식함
    formData.append('request', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    
    if (profileImage) {
      formData.append('profileImage', profileImage);
    }
    
    return client.put<RsData<void>>('/users/me/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  // 팔로우 실행
  follow: (nickname: string) => 
    client.post<RsData<void>>(`/follows/${nickname}`).then(res => res.data),

  // 팔로우 취소
  unfollow: (nickname: string) => 
    client.delete<RsData<void>>(`/follows/${nickname}`).then(res => res.data),

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
