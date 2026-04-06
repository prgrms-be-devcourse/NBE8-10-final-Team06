// src/api/auth.ts
/**
 * 인증 API. 로그인·refresh는 JWT를 HttpOnly 쿠키로만 내려주고, GET /auth/me 는 백엔드 MyInfoResponse(id, nickname, email)만 반환한다.
 */
import client from './client';
import { refreshClient } from './refreshClient';
import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  AuthMeResponse,
} from '../types/auth';
import { RsData } from '../types/common';
import { AxiosResponse } from 'axios';

export const authApi = {
  signup: async (data: SignupRequest): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<SignupResponse>> = await client.post('/auth/signup', data, {
      skipAuth: true,
    });
    return response.data;
  },

  login: async (data: LoginRequest): Promise<RsData<LoginResponse>> => {
    const response: AxiosResponse<RsData<LoginResponse>> = await client.post('/auth/login', data, {
      skipAuth: true,
    });
    return response.data;
  },

  /** 쿠키(refreshToken)만 사용 — 메인 client 인터셉터 미경유 */
  refresh: async (): Promise<RsData<LoginResponse>> => {
    const response: AxiosResponse<RsData<LoginResponse>> = await refreshClient.post('/auth/refresh');
    return response.data;
  },

  /**
   * GET /auth/me — 백엔드 MyInfoResponse(id, nickname, email)만.
   * `sessionProbe`: 앱 부트스트랩용. 비로그인 시 백엔드 403을 전역 세션 만료 처리에 넘기지 않음.
   */
  me: async (options?: { sessionProbe?: boolean }): Promise<RsData<AuthMeResponse>> => {
    const response: AxiosResponse<RsData<AuthMeResponse>> = await client.get('/auth/me', {
      ...(options?.sessionProbe ? { skip403SessionHandling: true } : {}),
    });
    return response.data;
  },

  // 로그아웃 API (POST /api/auth/logout)
  logout: async (): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.post('/auth/logout');
    return response.data;
  },

  checkEmail: async (email: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-email', {
      params: { email },
      skipAuth: true,
    });
    return response.data;
  },

  checkNickname: async (nickname: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-nickname', {
      params: { nickname },
      skipAuth: true,
    });
    return response.data;
  }
};
