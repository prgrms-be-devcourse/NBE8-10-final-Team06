// src/types/auth.ts
export interface SignupRequest {
  email: string;
  nickname: string;
  password: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  githubUrl?: string;
  resume: 'UNSPECIFIED' | 'UNDERGRADUATE' | 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  id: number;
  nickname: string;
  email: string;
  apiKey: string;
  /** 백엔드가 내려주는 경우에만 존재 — 스토리바·헤더 등과 동일 출처로 맞춤 */
  profileImageUrl?: string | null;
}

export type LoginResponse = string;
