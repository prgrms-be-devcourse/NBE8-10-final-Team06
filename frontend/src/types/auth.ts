export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

export type Gender = 'MALE' | 'FEMALE';
export type Resume = 'UNDERGRADUATE' | 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR';

export interface SignupRequest {
  nickname: string;
  email: string;
  password: string;
  birthDate: string;
  gender: Gender;
  githubUrl?: string;
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

/** 백엔드 AuthController.java L44 기준: data는 accessToken 문자열임 */
export type LoginAccessToken = string;
