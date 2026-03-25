// src/api/client.ts
import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 헤더에 토큰 주입
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  const apiKey = localStorage.getItem('apiKey');

  if (config.headers) {
    if (token && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (apiKey && apiKey !== 'null') {
      config.headers['X-API-KEY'] = apiKey;
    }
  }
  return config;
});

// 응답 인터셉터: 401 에러(인증 만료) 통합 처리
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
      
      // Zustand 스토어의 로그아웃 함수 호출
      // (store 외부에서 접근 시 getState() 사용)
      useAuthStore.getState().setLogout();
      
      // 로그인 페이지로 이동 (이미 로그인 페이지가 아니라면)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
