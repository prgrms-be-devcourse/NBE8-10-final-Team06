// src/types/auth.ts
export interface SignupRequest {
  email: string;
  nickname: string;
  password?: string; // 회원가입 시 필수, 조회 시 불필요
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface SignupResponse {
  id: number;
  nickname: string;
  email: string;
  apiKey: string | null;
}

export interface LoginResponse {
  accessToken: string;
  apiKey: string;
  id: number;
  nickname: string;
  email: string;
}
