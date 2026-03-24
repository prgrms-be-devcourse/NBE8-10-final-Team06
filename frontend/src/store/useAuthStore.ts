// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
  setLogin: (nickname: string, accessToken: string, apiKey: string | null, userId?: number) => void;
  setLogout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 초기화 시 'null' 문자열 및 유효성 체크
      isLoggedIn: !!localStorage.getItem('accessToken') && localStorage.getItem('accessToken') !== 'null',
      userId: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
      nickname: localStorage.getItem('nickname') !== 'null' ? localStorage.getItem('nickname') : null,
      
      setLogin: (nickname, accessToken, apiKey, userId) => {
        // 실제 유효한 값일 때만 로컬스토리지 저장
        if (accessToken && accessToken !== 'null') {
          localStorage.setItem('accessToken', accessToken);
        }
        
        if (nickname && nickname !== 'null') {
          localStorage.setItem('nickname', nickname);
        }

        if (userId) {
          localStorage.setItem('userId', userId.toString());
        }

        // null이 들어오면 문자열 "null"로 저장되지 않도록 삭제 처리
        if (apiKey && apiKey !== 'null' && apiKey.includes('.')) {
          localStorage.setItem('apiKey', apiKey);
        } else {
          localStorage.removeItem('apiKey'); // null이거나 형식이 안 맞으면 기존 값 삭제
        }
        
        set({ isLoggedIn: true, nickname, userId: userId || null });
      },
      
      setLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('apiKey');
        localStorage.removeItem('nickname');
        localStorage.removeItem('userId');
        set({ isLoggedIn: false, nickname: null, userId: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
