import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  nickname: string | null;
  setLogin: (nickname: string, accessToken: string, refreshToken: string) => void;
  setLogout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: !!localStorage.getItem('accessToken'),
      nickname: localStorage.getItem('nickname'),
      setLogin: (nickname, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('nickname', nickname);
        set({ isLoggedIn: true, nickname });
      },
      setLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('nickname');
        set({ isLoggedIn: false, nickname: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
