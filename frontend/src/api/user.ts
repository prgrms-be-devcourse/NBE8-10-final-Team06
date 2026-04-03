import client from './client';
import { RsData, Slice } from '../types/common';
import { appendJsonRequestPart } from '../util/formDataParts';
import { UserProfileResponse, ProfileUpdateRequest, UserSearchResponse, UserRecommendResponse } from '../types/user';
import { followApi, FOLLOW_CHANGED_EVENT } from './follow';

export { FOLLOW_CHANGED_EVENT };

export const userApi = {
  /**
   * 프로필 조회. 404는 axios 에러로 던지지 않고 RsData 형태로 돌려 콘솔/미처리 Promise 노이즈를 줄인다.
   * 경로 닉네임은 encodeURIComponent 로 안전하게 전달한다.
   */
  getProfile: (nickname: string, page: number = 0) =>
    client
      .get<RsData<UserProfileResponse>>(`/users/${encodeURIComponent(nickname)}/profile`, {
        params: { page, size: 9, _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      })
      .then((axiosRes) => {
        if (axiosRes.status === 404) {
          const body = axiosRes.data;
          if (body && typeof body === 'object' && 'resultCode' in body && body.resultCode) {
            return body;
          }
          return {
            resultCode: '404-U-1',
            msg: '존재하지 않는 사용자입니다.',
            data: null as unknown as UserProfileResponse,
          };
        }
        return axiosRes.data;
      }),

  // 내 프로필 정보 수정
  updateProfile: (req: ProfileUpdateRequest, profileImage?: File) => {
    const formData = new FormData();
    appendJsonRequestPart(formData, req);
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
      params: { keyword, page, size: 20, _: Date.now() },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }).then(res => res.data),

  // 사용자 추천 목록 조회
  getUserRecommendations: () =>
    client
      .get<RsData<UserRecommendResponse[]>>('/users/recommendations', {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((res) => res.data),

  follow: followApi.follow,
  unfollow: followApi.unfollow,
  isFollowing: followApi.isFollowing,
  getFollowers: followApi.getFollowers,
  getFollowings: followApi.getFollowings,
  getFollowerCount: followApi.getFollowerCount,
  getFollowingCount: followApi.getFollowingCount,

  /** DELETE /api/users/me */
  withdraw: () => client.delete<RsData<void>>('/users/me').then((res) => res.data),
};
