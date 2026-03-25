// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
  setLogin: (nickname: string, accessToken: string, apiKey: string | null, userId: number) => void;
  setLogout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: !!localStorage.getItem('accessToken'),
      userId: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
      nickname: localStorage.getItem('nickname'),
      
      setLogin: (nickname, accessToken, apiKey, userId) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('nickname', nickname);
        localStorage.setItem('userId', userId.toString());
        
        if (apiKey) {
          localStorage.setItem('apiKey', apiKey);
        } else {
          localStorage.removeItem('apiKey');
        }
        
        set({ isLoggedIn: true, nickname, userId });
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
