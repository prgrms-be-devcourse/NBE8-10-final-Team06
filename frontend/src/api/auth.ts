import { RsData, SignupRequest, SignupResponse, LoginRequest, LoginAccessToken } from '../types/auth';

const BASE_URL = '/api/auth';

export const signup = async (request: SignupRequest): Promise<RsData<SignupResponse>> => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
};

export const login = async (request: LoginRequest): Promise<RsData<LoginAccessToken>> => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
};

/** 내 정보 조회 (비로그인 시 에러 발생 가능) */
export const getMyInfo = async (): Promise<RsData<SignupResponse>> => {
  try {
    const response = await fetch(`${BASE_URL}/me`);
    if (!response.ok) throw new Error('Not Authenticated');
    return await response.json();
  } catch (e) {
    return { resultCode: '403-F', msg: 'Guest', data: null as any };
  }
};

/** 로그아웃 */
export const logout = async (): Promise<RsData<void>> => {
  const response = await fetch(`${BASE_URL}/logout`, { method: 'POST' });
  return response.json();
};

/** 이메일 중복 확인 (인증 헤더 없이 호출됨) */
export const checkEmail = async (email: string): Promise<RsData<void>> => {
  const response = await fetch(`${BASE_URL}/check-email?email=${encodeURIComponent(email)}`);
  return response.json();
};

/** 닉네임 중복 확인 (인증 헤더 없이 호출됨) */
export const checkNickname = async (nickname: string): Promise<RsData<void>> => {
  const response = await fetch(`${BASE_URL}/check-nickname?nickname=${encodeURIComponent(nickname)}`);
  return response.json();
};
