/**
 * Stress Test - 인증 흐름 부하 테스트
 *
 * 목적:
 * - VU당 최초 1회만 로그인
 * - 이후 iteration에서는 /api/auth/me -> /api/auth/refresh -> /api/auth/me 반복
 * - Refresh Token 기반 인증 흐름 안정성 확인
 *
 * 실행:
 *   k6 run -e BASE_URL=http://localhost:8080 infra/k6/scenarios/stress-auth-flow.js
 *   k6 run -e BASE_URL=https://devstagram.site infra/k6/scenarios/stress-auth-flow.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, pickUser, loginWithCookies, debugJar } from '../helpers/auth.js';
import { sleepRange } from '../helpers/data.js';

// 응답 시간 메트릭
const loginDuration = new Trend('auth_flow_login_duration', true);
const meBeforeRefreshDuration = new Trend('auth_flow_me_before_refresh_duration', true);
const refreshDuration = new Trend('auth_flow_refresh_duration', true);
const meAfterRefreshDuration = new Trend('auth_flow_me_after_refresh_duration', true);

// 성공률 메트릭
const loginSuccessRate = new Rate('auth_flow_login_success_rate');
const meBeforeRefreshSuccessRate = new Rate('auth_flow_me_before_refresh_success_rate');
const refreshSuccessRate = new Rate('auth_flow_refresh_success_rate');
const meAfterRefreshSuccessRate = new Rate('auth_flow_me_after_refresh_success_rate');
const authFlowErrorRate = new Rate('auth_flow_error_rate');

// 카운터 메트릭
const totalIterations = new Counter('auth_flow_total_iterations');
const totalLoginAttempts = new Counter('auth_flow_total_login_attempts');

export const options = {
    // iteration이 바뀌어도 쿠키를 유지해야 로그인 후 인증 흐름 테스트 가능
    noCookiesReset: true,
    stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.20'],
        http_req_duration: ['p(95)<5000'],

        auth_flow_error_rate: ['rate<0.20'],
        auth_flow_login_success_rate: ['rate>0.95'],
        auth_flow_me_before_refresh_success_rate: ['rate>0.95'],
        auth_flow_refresh_success_rate: ['rate>0.95'],
        auth_flow_me_after_refresh_success_rate: ['rate>0.95'],

        auth_flow_login_duration: ['p(95)<3000'],
        auth_flow_me_before_refresh_duration: ['p(95)<3000'],
        auth_flow_refresh_duration: ['p(95)<3000'],
        auth_flow_me_after_refresh_duration: ['p(95)<3000'],
    },
};

/**
 * VU별 로그인 상태
 */
let vuState = {
    loggedIn: false,
    loginBlocked: false,
};

/**
 * VU 최초 로그인 또는 재로그인
 */
function loginOncePerVu() {
    totalLoginAttempts.add(1);

    const user = pickUser(__VU);
    const { res, ok } = loginWithCookies(user.email, user.password);

    loginDuration.add(res.timings.duration);
    loginSuccessRate.add(ok);

    if (!ok) {
        authFlowErrorRate.add(true);

        const jarInfo = debugJar();

        console.log(
            `[auth-flow] login failed: vu=${__VU}, email=${user.email}, status=${res.status}, accessCookieCount=${jarInfo.accessTokenCount}, refreshCookieCount=${jarInfo.refreshTokenCount}, body=${res.body}`
        );

        if (res.status === 429) {
            vuState.loginBlocked = true;
        }

        vuState.loggedIn = false;
        return false;
    }

    vuState.loggedIn = true;
    vuState.loginBlocked = false;
    return true;
}

/**
 * 로그인 상태 보장
 */
function ensureLogin() {
    if (vuState.loggedIn) {
        return true;
    }

    if (vuState.loginBlocked) {
        sleep(sleepRange(3000, 5000));
        return false;
    }

    const ok = loginOncePerVu();

    if (!ok) {
        sleep(sleepRange(1000, 2000));
        return false;
    }

    sleep(sleepRange(200, 400));
    return true;
}

export default function () {
    totalIterations.add(1);

    // 먼저 로그인 보장
    if (!ensureLogin()) {
        return;
    }

    // 1. refresh 전 /me
    const meBeforeRefreshRes = http.get(`${BASE_URL}/api/auth/me`, {
        tags: { name: 'auth_me_before_refresh' },
    });

    meBeforeRefreshDuration.add(meBeforeRefreshRes.timings.duration);

    const meBeforeOk = check(meBeforeRefreshRes, {
        '[auth-flow] me before refresh status 200': (r) => r.status === 200,
    });

    meBeforeRefreshSuccessRate.add(meBeforeOk);

    if (!meBeforeOk) {
        const user = pickUser(__VU);
        const jarInfo = debugJar();

        console.log(
            `[auth-flow] me before refresh failed: vu=${__VU}, email=${user.email}, status=${meBeforeRefreshRes.status}, accessCookieCount=${jarInfo.accessTokenCount}, refreshCookieCount=${jarInfo.refreshTokenCount}, body=${meBeforeRefreshRes.body}`
        );

        authFlowErrorRate.add(true);
        vuState.loggedIn = false;

        sleep(sleepRange(1000, 2000));
        return;
    }

    sleep(sleepRange(200, 400));

    // 2. refresh 호출
    const refreshRes = http.post(`${BASE_URL}/api/auth/refresh`, null, {
        tags: { name: 'auth_refresh' },
    });

    refreshDuration.add(refreshRes.timings.duration);

    const refreshOk = check(refreshRes, {
        '[auth-flow] refresh status 200': (r) => r.status === 200,
        '[auth-flow] refreshed accessToken cookie exists': (r) =>
            !!r.cookies.accessToken && r.cookies.accessToken.length > 0,
        '[auth-flow] refreshed refreshToken cookie exists': (r) =>
            !!r.cookies.refreshToken && r.cookies.refreshToken.length > 0,
    });

    refreshSuccessRate.add(refreshOk);

    if (!refreshOk) {
        const user = pickUser(__VU);
        const jarInfo = debugJar();

        console.log(
            `[auth-flow] refresh failed: vu=${__VU}, email=${user.email}, status=${refreshRes.status}, accessCookieCount=${jarInfo.accessTokenCount}, refreshCookieCount=${jarInfo.refreshTokenCount}, body=${refreshRes.body}`
        );

        authFlowErrorRate.add(true);
        vuState.loggedIn = false;

        sleep(sleepRange(1000, 2000));
        return;
    }

    sleep(sleepRange(200, 400));

    // 3. refresh 후 /me
    const meAfterRefreshRes = http.get(`${BASE_URL}/api/auth/me`, {
        tags: { name: 'auth_me_after_refresh' },
    });

    meAfterRefreshDuration.add(meAfterRefreshRes.timings.duration);

    const meAfterOk = check(meAfterRefreshRes, {
        '[auth-flow] me after refresh status 200': (r) => r.status === 200,
    });

    meAfterRefreshSuccessRate.add(meAfterOk);

    if (!meAfterOk) {
        const user = pickUser(__VU);
        const jarInfo = debugJar();

        console.log(
            `[auth-flow] me after refresh failed: vu=${__VU}, email=${user.email}, status=${meAfterRefreshRes.status}, accessCookieCount=${jarInfo.accessTokenCount}, refreshCookieCount=${jarInfo.refreshTokenCount}, body=${meAfterRefreshRes.body}`
        );

        authFlowErrorRate.add(true);
        vuState.loggedIn = false;

        sleep(sleepRange(1000, 2000));
        return;
    }

    authFlowErrorRate.add(false);
    sleep(sleepRange(500, 1000));
}