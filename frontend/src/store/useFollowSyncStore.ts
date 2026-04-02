import { create } from 'zustand';

/**
 * 팔로우/언팔 발생 시 증가. 내 프로필로 라우트 전환 시 최신 팔로잉·목록을 다시 받기 위해 사용.
 */
interface FollowSyncState {
  epoch: number;
  bumpFollowSync: () => void;
}

export const useFollowSyncStore = create<FollowSyncState>((set) => ({
  epoch: 0,
  bumpFollowSync: () => set((s) => ({ epoch: s.epoch + 1 })),
}));
