import client from './client';
import type { RsData } from '../types/common';
import type { FollowResponse, FollowUserResponse } from '../types/user';
import { useFollowSyncStore } from '../store/useFollowSyncStore';
import { useFollowLocalStore } from '../store/useFollowLocalStore';

/** OpenAPI: FollowResponse — POST/DELETE /api/follows/{toUserId} */
export const FOLLOW_CHANGED_EVENT = 'follow:changed';

const emitFollowChanged = (payload: FollowResponse) => {
  const uid = Number(payload.toUserId);
  if (Number.isFinite(uid) && typeof payload.isFollowing === 'boolean') {
    useFollowLocalStore.getState().setFollowingHint(uid, payload.isFollowing);
  }
  window.dispatchEvent(new CustomEvent(FOLLOW_CHANGED_EVENT, { detail: payload }));
};

/** React 배치·낙관적 UI와의 순서 꼬임 완화 + 다른 라우트(내 프로필) 진입 시 재동기화 힌트 */
const emitFollowChangedDeferred = (payload: FollowResponse) => {
  queueMicrotask(() => {
    emitFollowChanged(payload);
    useFollowSyncStore.getState().bumpFollowSync();
  });
};

/** POST/DELETE 없이 상태만 맞출 때도 검색·모달·프로필 리스너가 돌 수 있게 */
export function scheduleFollowChangedNotification(payload: FollowResponse): void {
  emitFollowChangedDeferred(payload);
}

/**
 * OpenAPI follow-controller (/api/follows/…)
 * baseURL `/api` 는 client 에서 이미 붙음.
 */
/** 매 요청마다 새 타임스탬프(모듈 로드 시각 고정 방지) */
function noStoreGetConfig() {
  return {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } as const,
  };
}

/** HTTP만 — follow:changed 는 toggleFollowRelation 등에서 status 병합 후 한 번만 보냄 */
const requestFollow = (toUserId: number) =>
  client.post<RsData<FollowResponse>>(`/follows/${toUserId}`).then((res) => res.data);

const requestUnfollow = (toUserId: number) =>
  client.delete<RsData<FollowResponse>>(`/follows/${toUserId}`).then((res) => res.data);

export const followApi = {
  /** POST /follows/{toUserId} → RsDataFollowResponse (즉시 이벤트 — userApi 등 직접 호출용) */
  follow: (toUserId: number) =>
    requestFollow(toUserId).then((body) => {
      const fr = body?.data;
      if (fr) emitFollowChangedDeferred(fr);
      return body;
    }),

  /** DELETE /follows/{toUserId} → RsDataFollowResponse */
  unfollow: (toUserId: number) =>
    requestUnfollow(toUserId).then((body) => {
      const fr = body?.data;
      if (fr) emitFollowChangedDeferred(fr);
      return body;
    }),

  requestFollow,
  requestUnfollow,

  /** GET /follows/{toUserId}/status → RsDataBoolean */
  isFollowing: (toUserId: number) =>
    client
      .get<RsData<boolean>>(`/follows/${toUserId}/status`, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((res) => res.data),

  /** GET /follows/{userId}/followers → RsDataListFollowUserResponse */
  getFollowers: (userId: number) =>
    client
      .get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followers`, noStoreGetConfig())
      .then((res) => res.data),

  /** GET /follows/{userId}/followings */
  getFollowings: (userId: number) =>
    client
      .get<RsData<FollowUserResponse[]>>(`/follows/${userId}/followings`, noStoreGetConfig())
      .then((res) => res.data),

  /** GET /follows/{userId}/follower-count → RsDataLong */
  getFollowerCount: (userId: number) =>
    client
      .get<RsData<number>>(`/follows/${userId}/follower-count`, noStoreGetConfig())
      .then((res) => res.data),

  /** GET /follows/{userId}/following-count → RsDataLong */
  getFollowingCount: (userId: number) =>
    client
      .get<RsData<number>>(`/follows/${userId}/following-count`, noStoreGetConfig())
      .then((res) => res.data),
};
