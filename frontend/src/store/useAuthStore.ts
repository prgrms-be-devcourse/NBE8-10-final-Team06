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
      
      setLogin: (nickname, accessToken, apiKey, userId) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('nickname', nickname);
        localStorage.setItem('userId', userId.toString());
        setAuthCookie('accessToken', accessToken);
        
        if (apiKey) {
          localStorage.setItem('apiKey', apiKey);
          setAuthCookie('apiKey', apiKey);
        } else {
          localStorage.removeItem('apiKey');
          clearAuthCookie('apiKey');
        }
        
        set({ isLoggedIn: true, nickname, userId });
      },
      
      setLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('apiKey');
        localStorage.removeItem('nickname');
        localStorage.removeItem('userId');
        clearAuthCookie('accessToken');
        clearAuthCookie('apiKey');
        set({ isLoggedIn: false, nickname: null, userId: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
