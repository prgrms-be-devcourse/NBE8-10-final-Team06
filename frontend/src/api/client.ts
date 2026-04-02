import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { shouldTreat403ResponseAsSessionExpired } from '../util/apiError';
import { syncAuthTokensFromCookies } from '../util/authStorageSync';
import { getCookie } from '../util/cookies';

function clearSessionAndRedirectToLogin(reason: string) {
  console.error(`인증이 필요합니다 (${reason}). 세션을 종료하고 로그인 페이지로 이동합니다.`);
  const { setLogout } = useAuthStore.getState();
  setLogout();
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?reason=' + encodeURIComponent(reason);
  }
}

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.skipAuth) {
    if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers['X-API-KEY'];
    }
    return config;
  }

  syncAuthTokensFromCookies();

  let token = localStorage.getItem('accessToken');
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    const c = getCookie('accessToken');
    if (c && c.trim() !== '' && c !== 'null' && c !== 'undefined') {
      token = c.trim();
    }
  }

  let apiKey = localStorage.getItem('apiKey');
  if (!apiKey || apiKey === 'null' || apiKey === 'undefined' || apiKey.trim() === '') {
    const ck = getCookie('apiKey');
    if (ck && ck.trim() !== '' && ck !== 'null' && ck !== 'undefined') {
      apiKey = ck.trim();
    }
  }

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
    const data = error.response?.data;

    // 401: 미인증·만료 토큰 등 → 항상 세션 정리
    if (status === 401) {
      clearSessionAndRedirectToLogin('401');
      return Promise.reject(error);
    }

    // 403: 기본은 화면에서 처리(순수 권한 거부). 본문 resultCode가 인증 계열일 때만 세션 정리
    if (status === 403 && shouldTreat403ResponseAsSessionExpired(data)) {
      clearSessionAndRedirectToLogin('403-auth');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default client;
