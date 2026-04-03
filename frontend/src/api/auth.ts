// src/api/auth.ts
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
   * 백엔드는 MyInfoResponse(id, nickname, email)만 줌.
   * DmChatPage 등 기존 코드 호환을 위해 SignupResponse 형태로 정규화(apiKey는 빈 문자열).
   */
  me: async (): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<AuthMeResponse>> = await client.get('/auth/me');
    const body = response.data;
    return {
      ...body,
      data: {
        id: body.data.id,
        nickname: body.data.nickname,
        email: body.data.email,
        apiKey: '',
        profileImageUrl: undefined,
      },
    };
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
