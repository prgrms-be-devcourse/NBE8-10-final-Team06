import { create } from 'zustand';

/**
 * follow:changed(또는 동일 페이로드)로 확정된 팔로잉 여부를 세션 동안 보관한다.
 * 다른 페이지로 이동·재검색 시 GET 응답이 한 박자 늦어도 UI 가 맞물리도록 API 값보다 우선한다.
 */
interface FollowLocalState {
  followingHintByUserId: Record<number, boolean>;
  setFollowingHint: (userId: number, isFollowing: boolean) => void;
  clearFollowingHints: () => void;
}

export const useFollowLocalStore = create<FollowLocalState>((set) => ({
  followingHintByUserId: {},
  setFollowingHint: (userId, isFollowing) => {
    const id = Number(userId);
    if (!Number.isFinite(id)) return;
    set((s) => ({
      followingHintByUserId: { ...s.followingHintByUserId, [id]: isFollowing },
    }));
  },
  clearFollowingHints: () => set({ followingHintByUserId: {} }),
}));

/** 목록 행 등 — 힌트가 있으면 그걸 쓰고 없으면 API 값 */
export function mergeFollowingHint(userId: number, apiIsFollowing: boolean): boolean {
  const id = Number(userId);
  if (!Number.isFinite(id)) return apiIsFollowing;
  const h = useFollowLocalStore.getState().followingHintByUserId[id];
  return h !== undefined ? h : apiIsFollowing;
}
