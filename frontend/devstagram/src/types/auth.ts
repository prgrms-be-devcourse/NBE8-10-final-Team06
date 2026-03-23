/** 공통 응답 구조 */
export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

/** 성별 Enum (Gender.java 기준) */
export type Gender = 'MALE' | 'FEMALE';

/** 이력/경력 Enum (Resume.java 기준) */
export type Resume = 'UNDERGRADUATE' | 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR';

/** 회원가입 요청 (SignupRequest.java 기준) */
export interface SignupRequest {
  nickname: string;
  email: string;
  password: string;
  birthDate: string; // "YYYY-MM-DD"
  gender: Gender;
  githubUrl?: string;
  resume: Resume;
}

/** 회원가입 응답 (SignupResponse.java 기준) */
export interface SignupResponse {
  id: number;
  nickname: string;
  email: string;
  apiKey: string | null;
}

/** 로그인 요청 (LoginRequest.java 기준) */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 로그인 응답 (AuthController.java login 메서드 반환값 기준) */
export type LoginAccessToken = string;
