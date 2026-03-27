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
}

export type LoginResponse = string;
