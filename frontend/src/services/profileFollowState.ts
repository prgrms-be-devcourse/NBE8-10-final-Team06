import { followApi } from '../api/follow';
import { useAuthStore } from '../store/useAuthStore';
import { useFollowLocalStore } from '../store/useFollowLocalStore';
import type { UserProfileResponse } from '../types/user';
import { readRsDataBoolean } from '../util/rsDataBoolean';
import { isRsDataSuccess } from '../util/rsData';

/** Jackson 등으로 boolean 필드명이 달라질 때 보정 */
export function normalizeProfileFollowingField(data: UserProfileResponse): UserProfileResponse {
  const ext = data as UserProfileResponse & { following?: boolean };
  if (typeof ext.isFollowing === 'boolean') return data;
  if (typeof ext.following === 'boolean') return { ...data, isFollowing: ext.following };
  return data;
}

/**
 * GET /users/.../profile 의 isFollowing 은 permitAll·인증 타이밍에 틀릴 수 있어,
 * 남의 프로필이면 GET /follows/{id}/status 로 덮어쓴다.
 * 토큰 유무는 여기서 막지 않고 호출만 시도 — 미인증이면 401 후 프로필 값 유지.
 */
export async function applyAuthoritativeFollowStatus(
  profile: UserProfileResponse,
  isStale: () => boolean
): Promise<UserProfileResponse> {
  let p = normalizeProfileFollowingField(profile);
  const { userId: uid, nickname: myNick } = useAuthStore.getState();

  const viewingSelf =
    (uid != null && Number(p.userId) === Number(uid)) ||
    (myNick != null && myNick !== '' && p.nickname === myNick);

  if (viewingSelf) return p;

  const targetUserId = Number(p.userId);
  if (!Number.isFinite(targetUserId)) return p;

  const hinted = useFollowLocalStore.getState().followingHintByUserId[targetUserId];
  if (hinted !== undefined) {
    return { ...p, isFollowing: hinted };
  }

  try {
    const st = await followApi.isFollowing(targetUserId);
    if (isStale()) return p;
    if (isRsDataSuccess(st)) {
      const b = readRsDataBoolean(st);
      if (b !== null) {
        p = { ...p, isFollowing: b };
        /** GET status 결과로 세션 힌트를 맞춤 — F5 후 힌트가 비어도 이후 토글과 동일한 근거를 씀 */
        useFollowLocalStore.getState().setFollowingHint(targetUserId, b);
      }
    }
  } catch {
    /* 401 등 — 프로필 값 유지 */
  }
  return p;
}
