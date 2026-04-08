import { followApi } from '../api/follow';
import { mergeFollowingHint } from '../store/useFollowLocalStore';
import { isRsDataSuccess } from '../util/rsData';
import type { FollowUserResponse } from '../types/user';

/**
 * 내 팔로잉 목록(listOwner === 로그인 유저)에서만, 세션 힌트·API 기준으로 내가 더 이상 팔로우하지 않는 행 제거.
 * 서버 목록이 잠깐 구스냅샷일 때 언팔한 사람이 남는 현상 완화.
 */
export function filterMyFollowingsByActiveEdge(
  listOwnerUserId: number,
  viewerUserId: number | null | undefined,
  followings: FollowUserResponse[]
): FollowUserResponse[] {
  const owner = Number(listOwnerUserId);
  const v = viewerUserId != null ? Number(viewerUserId) : NaN;
  if (!Number.isFinite(owner) || !Number.isFinite(v) || owner !== v) {
    return followings;
  }
  return followings.filter((u) => mergeFollowingHint(u.userId, u.isFollowing));
}

/**
 * 남의 프로필 '팔로워' 목록: 내가 그 프로필 주인을 팔로우하지 않으면 나는 그의 팔로워가 아님 → 목록·카운트에서 본인 행 제거.
 * (GET 이 잠깐 구스냅샷일 때 언팔 후에도 내 닉네임이 남는 현상 완화)
 */
export function filterViewerFromOwnersFollowersWhenUnfollowed(
  ownerUserId: number,
  viewerUserId: number | null | undefined,
  followers: FollowUserResponse[],
  viewerFollowsOwner: boolean
): FollowUserResponse[] {
  if (viewerUserId == null || viewerFollowsOwner) return followers;
  const o = Number(ownerUserId);
  const v = Number(viewerUserId);
  if (!Number.isFinite(o) || !Number.isFinite(v) || o === v) return followers;
  return followers.filter((f) => Number(f.userId) !== v);
}

/**
 * 팔로워/팔로잉 목록 + 헤더용 카운트.
 * 백엔드에서 카운트 API와 목록 API가 어긋날 수 있으므로, 목록 조회가 성공한 경우 헤더 숫자는
 * 목록 길이와 동일하게 맞춘다(프로필 헤더 ↔ 팔로잉/팔로워 상세 모달 행 수 일치).
 * 목록만 실패한 경우에만 follower-count / following-count GET 값을 쓴다.
 */
export async function loadFollowListsAndCounts(
  userId: number,
  opts?: {
    viewerUserId?: number | null;
    /** 내가 이 프로필 주인을 팔로우 중이면 false 가 아님 — false 이면 팔로워 목록에서 viewer 행 제거 */
    viewerFollowsOwner?: boolean;
  }
): Promise<{
  followers: FollowUserResponse[];
  followings: FollowUserResponse[];
  followerCount: number | null;
  followingCount: number | null;
} | null> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return null;
  try {
    const [followersRes, followingsRes, fcRes, fgRes] = await Promise.all([
      followApi.getFollowers(uid),
      followApi.getFollowings(uid),
      followApi.getFollowerCount(uid),
      followApi.getFollowingCount(uid),
    ]);
    const followersOk = isRsDataSuccess(followersRes);
    const followingsOk = isRsDataSuccess(followingsRes);
    let followers = followersOk ? followersRes.data ?? [] : [];
    const hintedViewerFollows =
      opts?.viewerFollowsOwner !== undefined
        ? opts.viewerFollowsOwner
        : mergeFollowingHint(uid, true);
    const viewerFollows = hintedViewerFollows;
    followers = filterViewerFromOwnersFollowersWhenUnfollowed(
      uid,
      opts?.viewerUserId ?? null,
      followers,
      viewerFollows
    );
    let followings = followingsOk ? followingsRes.data ?? [] : [];
    followings = filterMyFollowingsByActiveEdge(uid, opts?.viewerUserId ?? null, followings);
    const followerCountApi =
      isRsDataSuccess(fcRes) && typeof fcRes.data === 'number' ? fcRes.data : null;
    const followingCountApi =
      isRsDataSuccess(fgRes) && typeof fgRes.data === 'number' ? fgRes.data : null;
    /**
     * 헤더 숫자는 모달 목록과 반드시 같아야 하므로, 목록 API가 성공하면 카운트는 목록 길이를 쓴다.
     * 목록만 실패했을 때만 전용 count GET 값을 쓴다.
     */
    return {
      followers,
      followings,
      followerCount: followersOk ? followers.length : followerCountApi,
      followingCount: followingsOk ? followings.length : followingCountApi,
    };
  } catch {
    return null;
  }
}
