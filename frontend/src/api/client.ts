import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { shouldTreat403ResponseAsSessionExpired } from '../util/apiError';
import { refreshClient } from './refreshClient';

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

function shouldSkipRefreshOn401(config: InternalAxiosRequestConfig): boolean {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  if (method === 'post' && url.includes('/auth/login')) return true;
  if (method === 'post' && url.includes('/auth/signup')) return true;
  if (method === 'get' && url.includes('/auth/check-email')) return true;
  if (method === 'get' && url.includes('/auth/check-nickname')) return true;
  if (method === 'post' && url.includes('/auth/refresh')) return true;
  return false;
}

let isRefreshing = false;
let refreshWaitQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

function flushRefreshQueue(err: unknown) {
  const q = refreshWaitQueue;
  refreshWaitQueue = [];
  if (err) {
    q.forEach(({ reject }) => reject(err));
  } else {
    q.forEach(({ resolve }) => resolve());
  }
}

async function runRefreshOnce(): Promise<void> {
  await refreshClient.post('/auth/refresh');
}

// 요청 인터셉터 — 쿠키만 사용(브라우저 전송). Bearer / X-API-KEY / localStorage 동기화 없음.
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.skipAuth && config.headers) {
    delete config.headers.Authorization;
    delete config.headers['X-API-KEY'];
  }
  return config;
});

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const originalConfig = error.config as InternalAxiosRequestConfig | undefined;

    if (
      status === 403 &&
      shouldTreat403ResponseAsSessionExpired(data) &&
      !originalConfig?.skip403SessionHandling
    ) {
      clearSessionAndRedirectToLogin('403-auth');
      return Promise.reject(error);
    }

    if (status !== 401 || !originalConfig) {
      return Promise.reject(error);
    }

    if (shouldSkipRefreshOn401(originalConfig)) {
      return Promise.reject(error);
    }

    if (originalConfig._retryAfterRefresh) {
      clearSessionAndRedirectToLogin('401-retry-failed');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        const cfg = originalConfig;
        refreshWaitQueue.push({
          resolve: () => {
            cfg._retryAfterRefresh = true;
            resolve(client.request(cfg));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalConfig._retryAfterRefresh = true;

    try {
      await runRefreshOnce();
      flushRefreshQueue(null);
      return client.request(originalConfig);
    } catch (refreshErr) {
      flushRefreshQueue(refreshErr);
      clearSessionAndRedirectToLogin('refresh-failed');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
