// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncAuthTokensFromCookies } from '../util/authStorageSync';
import { useFollowLocalStore } from './useFollowLocalStore';
import { useProfileImageCacheStore } from './useProfileImageCacheStore';

interface AuthState {
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
  /** 피드/프로필과 동일한 프로필 이미지 URL (스토리바 ‘내 스토리’ 등 공통 출처) */
  profileImageUrl: string | null;
  setLogin: (
    nickname: string,
    accessToken: string,
    /** undefined: 기존 localStorage apiKey 유지(삭제하지 않음) */
    apiKey: string | null | undefined,
    userId: number,
    profileImageUrl?: string | null
  ) => void;
  setSessionProfileImageUrl: (url: string | null) => void;
  /** 닉네임만 바꿀 때 — accessToken·apiKey는 건드리지 않음(403 방지) */
  setSessionNickname: (nickname: string) => void;
  /** /auth/me 등으로 확인한 실제 로그인 id — 저장소·DM 표시 정합성용 */
  setSessionUserId: (userId: number) => void;
  setLogout: () => void;
}

const setAuthCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
};

const clearAuthCookie = (name: string) => {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: !!localStorage.getItem('accessToken'),
      userId: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
      nickname: localStorage.getItem('nickname'),
      profileImageUrl: null,

      setLogin: (nickname, accessToken, apiKey, userId, profileImageUrl) => {
        const prevToken = localStorage.getItem('accessToken') ?? '';
        const nextToken =
          accessToken != null && String(accessToken).trim() !== ''
            ? String(accessToken).trim()
            : prevToken.trim() !== ''
              ? prevToken.trim()
              : '';

        localStorage.setItem('accessToken', nextToken);
        localStorage.setItem('nickname', nickname);
        localStorage.setItem('userId', userId.toString());
        setAuthCookie('accessToken', nextToken);

        // /auth/me 는 SignupResponse.from 으로 항상 apiKey: null 이라, null 일 때 지우면 매 로그인마다 키가 삭제됨.
        // 비어 있으면 저장소를 건드리지 않음(명시적 setLogout 만 제거).
        if (apiKey != null && String(apiKey).trim() !== '') {
          const k = String(apiKey).trim();
          localStorage.setItem('apiKey', k);
          setAuthCookie('apiKey', k);
        }

        set((state) => ({
          isLoggedIn: true,
          nickname,
          userId,
          profileImageUrl: profileImageUrl !== undefined ? profileImageUrl ?? null : state.profileImageUrl,
        }));
      },

      setSessionNickname: (nickname) => {
        localStorage.setItem('nickname', nickname);
        set({ nickname });
      },

      setSessionUserId: (userId) => {
        localStorage.setItem('userId', String(userId));
        set({ userId });
      },

      setSessionProfileImageUrl: (url) => set({ profileImageUrl: url }),

      setLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('apiKey');
        localStorage.removeItem('nickname');
        localStorage.removeItem('userId');
        clearAuthCookie('accessToken');
        clearAuthCookie('apiKey');
        useFollowLocalStore.getState().clearFollowingHints();
        useProfileImageCacheStore.getState().clear();
        set({ isLoggedIn: false, nickname: null, userId: null, profileImageUrl: null });
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
        syncAuthTokensFromCookies();
        const token = localStorage.getItem('accessToken');
        const ok =
          !!token &&
          token.trim() !== '' &&
          token !== 'null' &&
          token !== 'undefined';
        if (!ok) {
          useAuthStore.getState().setLogout();
        } else {
          useAuthStore.setState({ isLoggedIn: true });
        }
      },
    }
  )
);
