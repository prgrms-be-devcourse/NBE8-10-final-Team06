import http from 'k6/http';
import { check } from 'k6';

// 테스트 대상 서버 주소
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

/**
 * 테스트 유저 목록
 *
 * 주의:
 * - 현재 10개뿐이라 VU 수가 커지면 같은 계정을 여러 VU가 같이 사용할 수 있음
 * - refresh token 재발급 테스트를 크게 돌릴 때는 계정 수를 늘리는 것이 좋음
 */
export const TEST_USERS = [
    { email: 'k6test01@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test02@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test03@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test04@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test05@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test06@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test07@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test08@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test09@devstagram.com', password: 'Test1234Pw' },
    { email: 'k6test10@devstagram.com', password: 'Test1234Pw' },
];

/**
 * VU 번호 기준으로 테스트 유저 선택
 *
 * __VU는 1부터 시작하므로 -1 보정 필요
 */
export function pickUser(vuId) {
    return TEST_USERS[(vuId - 1) % TEST_USERS.length];
}

/**
 * 응답에 특정 쿠키가 존재하는지 확인
 */
export function hasCookie(res, cookieName) {
    return !!res.cookies[cookieName] && res.cookies[cookieName].length > 0;
}

/**
 * 현재 cookie jar 상태 요약
 */
export function debugJar(url = BASE_URL) {
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL(url);

    return {
        accessTokenCount: cookies.accessToken ? cookies.accessToken.length : 0,
        refreshTokenCount: cookies.refreshToken ? cookies.refreshToken.length : 0,
    };
}

/**
 * 쿠키 기반 로그인 요청
 */
export function loginWithCookies(email, password) {
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email, password }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_login_once' },
        }
    );

    const ok = check(res, {
        '[auth-flow] login status 200': (r) => r.status === 200,
        '[auth-flow] accessToken cookie exists': (r) => hasCookie(r, 'accessToken'),
        '[auth-flow] refreshToken cookie exists': (r) => hasCookie(r, 'refreshToken'),
    });

    return { res, ok };
}

export { BASE_URL };