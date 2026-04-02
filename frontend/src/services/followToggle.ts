import { followApi, scheduleFollowChangedNotification } from '../api/follow';
import type { FollowResponse } from '../types/user';
import type { RsData } from '../types/common';
import { readFollowStatusFromRsData, readRsDataBoolean } from '../util/rsDataBoolean';
import { isRsDataSuccess } from '../util/rsData';

const pendingUserIds = new Set<number>();

function rsOk(res: RsData<unknown>): boolean {
  return isRsDataSuccess(res);
}

function readAxiosServiceCode(e: unknown): string | undefined {
  const d = (e as { response?: { data?: { resultCode?: string } } })?.response?.data;
  return d?.resultCode;
}

/** OpenAPI GET …/follower-count, …/following-count — RsDataLong */
async function hydrateFollowCounts(
  toUserId: number,
  myUserId: number | null | undefined
): Promise<{ followerCount: number; followingCount: number }> {
  try {
    const followerP = followApi.getFollowerCount(toUserId);
    if (myUserId == null) {
      const followerRes = await followerP;
      return {
        followerCount:
          isRsDataSuccess(followerRes) && typeof followerRes.data === 'number' ? followerRes.data : 0,
        followingCount: 0,
      };
    }
    const [followerRes, followingRes] = await Promise.all([
      followerP,
      followApi.getFollowingCount(myUserId),
    ]);
    return {
      followerCount:
        isRsDataSuccess(followerRes) && typeof followerRes.data === 'number' ? followerRes.data : 0,
      followingCount:
        isRsDataSuccess(followingRes) && typeof followingRes.data === 'number' ? followingRes.data : 0,
    };
  } catch {
    return { followerCount: 0, followingCount: 0 };
  }
}

async function buildFollowPayload(
  toUserId: number,
  isFollowing: boolean,
  myUserId: number | null | undefined
): Promise<FollowResponse> {
  const counts = await hydrateFollowCounts(toUserId, myUserId);
  return { toUserId, isFollowing, ...counts };
}

async function syncAndNotify(
  tid: number,
  isFollowing: boolean,
  myUserId: number | null | undefined
): Promise<ToggleFollowResult> {
  const fr = await buildFollowPayload(tid, isFollowing, myUserId);
  scheduleFollowChangedNotification(fr);
  return { ok: true, follow: fr, countsFromServer: false };
}

export type ToggleFollowResult =
  | { ok: true; follow: FollowResponse; countsFromServer: boolean }
  | { ok: false; reason: 'self' | 'busy' | 'failed'; message?: string };

/** 버튼 기준 의도 — UI boolean 과 서버 불일치 시에도 올바른 HTTP 동작을 고르기 위함 */
export type FollowToggleIntent = 'follow' | 'unfollow';

/** POST/DELETE 응답의 isFollowing 과 어긋날 수 있어, 성공 직후 status 로 한 번 더 맞춤 */
async function attachAuthoritativeIsFollowing(tid: number, fr: FollowResponse): Promise<FollowResponse> {
  try {
    const st = await followApi.isFollowing(tid);
    if (rsOk(st)) {
      const b = readRsDataBoolean(st);
      if (b !== null) {
        return { ...fr, isFollowing: b };
      }
    }
  } catch {
    /* */
  }
  return fr;
}

/**
 * POST/DELETE /api/follows/{toUserId}
 *
 * - intent: 화면 버튼과 동일(팔로우 클릭 → follow, 팔로잉·언팔 클릭 → unfollow).
 * - 팔로우: 서버에 이미 관계가 있으면 POST 생략(400-F-2 방지) 후 동기화 + 이벤트.
 * - 언팔: 항상 DELETE 시도(400-F-3 이면 이미 언팔로 간주). 성공 후 status 로 isFollowing 확정.
 */
export async function toggleFollowRelation(
  toUserId: number,
  intent: FollowToggleIntent,
  myUserId?: number | null
): Promise<ToggleFollowResult> {
  const tid = Number(toUserId);
  if (!Number.isFinite(tid)) {
    return { ok: false, reason: 'failed', message: '유효하지 않은 사용자입니다.' };
  }
  const myId = myUserId != null ? Number(myUserId) : null;
  if (myId != null && Number.isFinite(myId) && myId === tid) {
    return { ok: false, reason: 'self', message: '자기 자신을 팔로우할 수 없습니다.' };
  }
  if (pendingUserIds.has(tid)) {
    return { ok: false, reason: 'busy' };
  }
  pendingUserIds.add(tid);
  try {
    let baselineFollowing = false;
    try {
      const pre = await followApi.isFollowing(tid);
      if (rsOk(pre)) {
        const b = readRsDataBoolean(pre);
        if (b !== null) baselineFollowing = b;
      }
    } catch {
      /* */
    }

    /** 팔로우 의도인데 서버에 이미 관계 있음 → POST 생략 */
    if (intent === 'follow' && baselineFollowing) {
      return syncAndNotify(tid, true, myUserId);
    }

    /** 언팔 의도: 항상 DELETE (baseline 이 false 여도 잔여 행 제거) */
    if (intent === 'unfollow') {
      try {
        const res = await followApi.requestUnfollow(tid);
        if (isRsDataSuccess(res)) {
          if (!res.data) {
            return syncAndNotify(tid, false, myUserId);
          }
          /**
           * DELETE 성공이면 관계는 제거된 것으로 본다.
           * 직후 GET /status 가 캐시·지연으로 true 를 주면 UI 만 다시 '팔로잉'으로 돌아가므로 status 머지는 쓰지 않는다.
           */
          const merged: FollowResponse = { ...res.data, isFollowing: false };
          scheduleFollowChangedNotification(merged);
          return { ok: true, follow: merged, countsFromServer: true };
        }
        try {
          const sync = await followApi.isFollowing(tid);
          if (rsOk(sync)) {
            const isFollowing = readFollowStatusFromRsData(sync, baselineFollowing);
            return syncAndNotify(tid, isFollowing, myUserId);
          }
        } catch {
          /* */
        }
        return { ok: false, reason: 'failed', message: res.msg || '팔로우 처리에 실패했습니다.' };
      } catch (e: unknown) {
        const code = readAxiosServiceCode(e);
        const msg = (e as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
        if (code === '400-F-4') {
          return { ok: false, reason: 'failed', message: msg || '팔로우 처리에 실패했습니다.' };
        }
        if (code === '400-F-3') {
          const fr = await buildFollowPayload(tid, false, myUserId);
          const merged = await attachAuthoritativeIsFollowing(tid, fr);
          scheduleFollowChangedNotification(merged);
          return { ok: true, follow: merged, countsFromServer: false };
        }
        try {
          const sync = await followApi.isFollowing(tid);
          if (rsOk(sync)) {
            const isFollowing = readFollowStatusFromRsData(sync, baselineFollowing);
            return syncAndNotify(tid, isFollowing, myUserId);
          }
        } catch {
          /* */
        }
        return { ok: false, reason: 'failed', message: msg || '팔로우 처리에 실패했습니다.' };
      }
    }

    /** 팔로우: intent === follow && !baselineFollowing */
    try {
      const res = await followApi.requestFollow(tid);
      if (isRsDataSuccess(res)) {
        if (!res.data) {
          return syncAndNotify(tid, true, myUserId);
        }
        /** POST 성공 시 팔로우 관계는 성립한 것으로 본다(status GET 이 일시 false 를 주는 경우 방지) */
        const merged: FollowResponse = { ...res.data, isFollowing: true };
        scheduleFollowChangedNotification(merged);
        return { ok: true, follow: merged, countsFromServer: true };
      }
      try {
        const sync = await followApi.isFollowing(tid);
        if (rsOk(sync)) {
          const isFollowing = readFollowStatusFromRsData(sync, baselineFollowing);
          return syncAndNotify(tid, isFollowing, myUserId);
        }
      } catch {
        /* */
      }
      return { ok: false, reason: 'failed', message: res.msg || '팔로우 처리에 실패했습니다.' };
    } catch (e: unknown) {
      const code = readAxiosServiceCode(e);
      const msg = (e as { response?: { data?: { msg?: string } } })?.response?.data?.msg;
      if (code === '400-F-4') {
        return { ok: false, reason: 'failed', message: msg || '팔로우 처리에 실패했습니다.' };
      }
      if (code === '400-F-2' || code === '400-F-3') {
        try {
          const sync = await followApi.isFollowing(tid);
          if (rsOk(sync)) {
            const isFollowing = readFollowStatusFromRsData(sync, baselineFollowing);
            return syncAndNotify(tid, isFollowing, myUserId);
          }
        } catch {
          /* */
        }
        if (code === '400-F-2') {
          return syncAndNotify(tid, true, myUserId);
        }
        return syncAndNotify(tid, false, myUserId);
      }
      try {
        const sync = await followApi.isFollowing(tid);
        if (rsOk(sync)) {
          const isFollowing = readFollowStatusFromRsData(sync, baselineFollowing);
          return syncAndNotify(tid, isFollowing, myUserId);
        }
      } catch {
        /* */
      }
      return { ok: false, reason: 'failed', message: msg || '팔로우 처리에 실패했습니다.' };
    }
  } finally {
    pendingUserIds.delete(tid);
  }
}
