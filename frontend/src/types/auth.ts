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

// 백엔드 AuthController.login이 RsData<String>을 반환하므로, data는 string입니다.
export type LoginResponse = string; 
