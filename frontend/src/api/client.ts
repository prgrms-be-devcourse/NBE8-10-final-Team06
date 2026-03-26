import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  const apiKey = localStorage.getItem('apiKey');

  if (config.headers) {
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token.trim()}`;
    } else {
      delete config.headers.Authorization;
    }

    if (apiKey && apiKey !== 'null' && apiKey !== 'undefined' && apiKey.trim() !== '') {
      config.headers['X-API-KEY'] = apiKey.trim();
    }
  }
  return config;
});

// 응답 인터셉터
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const status = error.response?.status;
    
    // 401(인증만료) 또는 403(권한없음/토큰부적합) 발생 시 세션 파괴 및 로그인 이동
    if (status === 401 || status === 403) {
      console.error(`인증 오류 (${status}): 세션을 종료하고 로그인 페이지로 이동합니다.`);
      
      const { setLogout } = useAuthStore.getState();
      setLogout();
      
      // 무한 리다이렉트 방지
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=' + status;
      }
    }
    return Promise.reject(error);
  }
);

export default client;
