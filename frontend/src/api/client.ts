// src/api/client.ts
import axios, { InternalAxiosRequestConfig } from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true, // 쿠키 전송 허용 (백엔드 rq.setCookie 대응)
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  const apiKey = localStorage.getItem('apiKey');

  if (config.headers) {
    // 1. accessToken이 실제 값이 있을 때만 Bearer 헤더 추가 (null/undefined 문자열 방지)
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. apiKey가 실제 형식을 갖추었을 때만(null 문자열 방지) X-API-KEY 헤더 추가
    // 백엔드 필터 로직상 apiKey는 반드시 '.'을 포함해야 함 (유저ID.UUID)
    if (apiKey && apiKey !== 'null' && apiKey !== 'undefined' && apiKey.includes('.')) {
      config.headers['X-API-KEY'] = apiKey;
    }
  }
  return config;
});

export default client;
