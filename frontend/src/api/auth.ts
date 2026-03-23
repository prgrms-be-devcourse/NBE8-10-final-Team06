import axios, { AxiosResponse } from 'axios';
import { SignupRequest, SignupResponse, LoginRequest, LoginResponse } from '../types/auth';
import { RsData } from '../types/common';

// 백엔드 AuthController가 @RequestMapping("/api/auth")이므로 baseURL은 /api로 설정합니다.
const API_BASE_URL = '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  // 회원가입: /api/auth/signup
  signup: async (data: SignupRequest): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<SignupResponse>> = await client.post('/auth/signup', data);
    return response.data;
  },

  // 로그인: /api/auth/login
  login: async (data: LoginRequest): Promise<RsData<LoginResponse>> => {
    const response: AxiosResponse<RsData<LoginResponse>> = await client.post('/auth/login', data);
    return response.data;
  },

  // 이메일 중복 체크
  checkEmail: async (email: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-email', {
      params: { email }
    });
    return response.data;
  },

  // 닉네임 중복 체크
  checkNickname: async (nickname: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-nickname', {
      params: { nickname }
    });
    return response.data;
  }
  };
