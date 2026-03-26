import client from './client';
import { RsData, Slice } from '../types/common';
import { FollowUserResponse, FollowResponse, UserProfileResponse, ProfileUpdateRequest, UserSearchResponse } from '../types/user';

export const userApi = {
  // 특정 사용자의 프로필 조회
  getProfile: (nickname: string, page: number = 0) =>
    client.get<RsData<UserProfileResponse>>(`/users/${nickname}/profile`, {
      params: { page, size: 9 }
    }).then(res => res.data),

  // 내 프로필 정보 수정
  updateProfile: (req: ProfileUpdateRequest, profileImage?: File) => {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    if (profileImage) {
      formData.append('profileImage', profileImage);
    }
    return client.put<RsData<void>>('/users/me/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  // 유저 검색 (페이징 지원)
  searchUsers: (keyword: string, page: number = 0) =>
    client.get<RsData<Slice<UserSearchResponse>>>('/users/search', {
      params: { keyword, page, size: 20 }
    }).then(res => res.data),

  // 팔로우 실행 (ID 기반으로 수정)
  follow: (userId: number) => 
    client.post<RsData<FollowResponse>>(`/follows/${userId}`).then(res => res.data),

  // 팔로우 취소 (ID 기반으로 수정)
  unfollow: (userId: number) => 
    client.delete<RsData<FollowResponse>>(`/follows/${userId}`).then(res => res.data),

  // 팔로워 목록 조회
  getFollowers: (userId: number) => 
    client.get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followers`).then(res => res.data),

  // 팔로잉 목록 조회
  getFollowings: (userId: number) => 
    client.get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followings`).then(res => res.data),
};
