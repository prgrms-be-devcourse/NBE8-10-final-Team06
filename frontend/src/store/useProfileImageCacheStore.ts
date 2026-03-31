import { create } from 'zustand';

type Tier = 'authoritative' | 'hint';

type Entry = { url: string | null; tier: Tier };

/**
 * 같은 userId에 대해 화면마다 다른 필드(me/피드/포스트/댓글)로 내려오는 프로필 이미지 URL을
 * 한 값으로 맞추기 위한 클라이언트 캐시(백엔드 변경 없음).
 * - authoritative: GET /users/{nickname}/profile 등 프로필 API 기준
 * - hint: authoritative가 없을 때만 채우며, 첫 번째 비어 있지 않은 값을 유지(일관성)
 */
interface ProfileImageCacheState {
  entries: Record<number, Entry>;
  setAuthoritativeProfileImage: (userId: number, url: string | null | undefined) => void;
  seedProfileImageHint: (userId: number, url: string | null | undefined) => void;
  clear: () => void;
}

export const useProfileImageCacheStore = create<ProfileImageCacheState>((set, get) => ({
  entries: {},

  setAuthoritativeProfileImage: (userId, url) => {
    const id = Number(userId);
    if (!Number.isFinite(id)) return;
    const normalized = typeof url === 'string' && url.trim() !== '' ? url.trim() : null;
    set((s) => ({
      entries: { ...s.entries, [id]: { url: normalized, tier: 'authoritative' } },
    }));
  },

  seedProfileImageHint: (userId, url) => {
    const id = Number(userId);
    if (!Number.isFinite(id)) return;
    const normalized = typeof url === 'string' && url.trim() !== '' ? url.trim() : null;
    if (normalized == null) return;

    const cur = get().entries[id];
    if (cur?.tier === 'authoritative') return;
    if (cur?.tier === 'hint' && cur.url != null && String(cur.url).trim() !== '') return;

    set((s) => ({
      entries: { ...s.entries, [id]: { url: normalized, tier: 'hint' } },
    }));
  },

  clear: () => set({ entries: {} }),
}));
