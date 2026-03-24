// src/types/auth.ts
import { Gender, Resume } from './common';

export interface SignupRequest {
  nickname: string;
  email: string;
  password: string;
  birthDate: string;
  gender: Gender;
  githubUrl: string;
  resume: Resume;
}

export interface SignupResponse {
  id: number;
  nickname: string;
  email: string;
  apiKey: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// 백엔드 AuthController.login 롤백에 맞춰 다시 string(accessToken)으로 변경
export type LoginResponse = string;
