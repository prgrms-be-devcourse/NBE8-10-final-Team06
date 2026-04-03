import axios from 'axios';

/** 401 시 토큰 재발급 전용 — 메인 client 인터셉터와 순환하지 않음 */
export const refreshClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
