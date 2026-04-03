// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useFollowLocalStore } from './useFollowLocalStore';
import { useProfileImageCacheStore } from './useProfileImageCacheStore';

interface AuthState {
  /** 부트스트랩(me) 완료 전에는 PrivateRoute 가 로그인으로 보내지 않음 */
  authReady: boolean;
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
  /** 피드/프로필과 동일한 프로필 이미지 URL */
  profileImageUrl: string | null;
  /** 로그인 직후·부트스트랩 성공 시 (토큰·apiKey 없음) */
  setLogin: (nickname: string, userId: number, profileImageUrl?: string | null) => void;
  setSessionProfileImageUrl: (url: string | null) => void;
  setSessionNickname: (nickname: string) => void;
  setSessionUserId: (userId: number) => void;
  setLogout: () => void;
}

const clearLegacyAuthCookies = () => {
  const clear = (name: string) => {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  };
  clear('accessToken');
  clear('apiKey');
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authReady: false,
      isLoggedIn: false,
      userId: null,
      nickname: null,
      profileImageUrl: null,

      setLogin: (nickname, userId, profileImageUrl) => {
        set((state) => ({
          isLoggedIn: true,
          nickname,
          userId,
          profileImageUrl:
            profileImageUrl !== undefined ? profileImageUrl ?? null : state.profileImageUrl,
        }));
      },

      setSessionNickname: (nickname) => {
        set({ nickname });
      },

      setSessionUserId: (userId) => {
        set({ userId });
      },

      setSessionProfileImageUrl: (url) => set({ profileImageUrl: url }),

      setLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('apiKey');
        clearLegacyAuthCookies();
        useFollowLocalStore.getState().clearFollowingHints();
        useProfileImageCacheStore.getState().clear();
        set({
          isLoggedIn: false,
          nickname: null,
          userId: null,
          profileImageUrl: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        nickname: state.nickname,
        userId: state.userId,
        profileImageUrl: state.profileImageUrl,
      }),
      onRehydrateStorage: () => (_persisted, error) => {
        if (error) return;
        useAuthStore.setState({ isLoggedIn: false, authReady: false });
      },
    }
  )
);
