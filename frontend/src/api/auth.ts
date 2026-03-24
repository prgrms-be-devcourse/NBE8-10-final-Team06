// src/api/auth.ts
import client from './client';
import { SignupRequest, SignupResponse, LoginRequest, LoginResponse } from '../types/auth';
import { RsData } from '../types/common';
import { AxiosResponse } from 'axios';

export const authApi = {
  signup: async (data: SignupRequest): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<SignupResponse>> = await client.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<RsData<LoginResponse>> => {
    const response: AxiosResponse<RsData<LoginResponse>> = await client.post('/auth/login', data);
    return response.data;
  },

  // 내 정보 조회 API (GET /api/auth/me)
  me: async (): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<SignupResponse>> = await client.get('/auth/me');
    return response.data;
  },

  // 로그아웃 API (POST /api/auth/logout)
  logout: async (): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.post('/auth/logout');
    return response.data;
  },

  checkEmail: async (email: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-email', {
      params: { email }
    });
    return response.data;
  },

  checkNickname: async (nickname: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-nickname', {
      params: { nickname }
    });
    return response.data;
  }
};
