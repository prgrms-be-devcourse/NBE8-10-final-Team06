import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://devstagram.site';

/**
 * 테스트 유저 계정 목록 (사전에 DB에 등록된 계정)
 * 실제 테스트 전 seed 스크립트로 생성 필요
 */
export const TEST_USERS = [
    { email: 'test01@devstagram.com', password: 'Test1234!!' },
    { email: 'test02@devstagram.com', password: 'Test1234!!' },
    { email: 'test03@devstagram.com', password: 'Test1234!!' },
    { email: 'test04@devstagram.com', password: 'Test1234!!' },
    { email: 'test05@devstagram.com', password: 'Test1234!!' },
    { email: 'test06@devstagram.com', password: 'Test1234!!' },
    { email: 'test07@devstagram.com', password: 'Test1234!!' },
    { email: 'test08@devstagram.com', password: 'Test1234!!' },
    { email: 'test09@devstagram.com', password: 'Test1234!!' },
    { email: 'test10@devstagram.com', password: 'Test1234!!' },
];

/**
 * 로그인 후 accessToken 쿠키 반환
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, cookies: object } | null}
 */
export function login(email, password) {
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email, password }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_login' },
        }
    );

    const ok = check(res, {
        'login 200': (r) => r.status === 200,
    });

    if (!ok) return null;

    const cookieJar = res.cookies['accessToken'];
    const token = cookieJar && cookieJar.length > 0 ? cookieJar[0].value : null;

    return { token, cookies: res.cookies };
}

/**
 * 로그인 후 Bearer 토큰 포함 헤더 반환
 */
export function getAuthHeaders(email, password) {
    const result = login(email, password);
    if (!result || !result.token) return null;
    return {
        Authorization: `Bearer ${result.token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * VU 번호로 순환 유저 선택
 */
export function pickUser(vuId) {
    return TEST_USERS[vuId % TEST_USERS.length];
}

export { BASE_URL };
