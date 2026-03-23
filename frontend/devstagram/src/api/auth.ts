import { RsData, SignupRequest, SignupResponse, LoginRequest, LoginAccessToken } from '../types/auth';

const BASE_URL = '/api/auth';

/**
 * 회원가입 API
 * @path POST /api/auth/signup
 */
export const signup = async (request: SignupRequest): Promise<RsData<SignupResponse>> => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
};

/**
 * 로그인 API
 * @path POST /api/auth/login
 * @description 백엔드에서 쿠키를 자동으로 설정하지만, body로도 accessToken을 반환함
 */
export const login = async (request: LoginRequest): Promise<RsData<LoginAccessToken>> => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
};
