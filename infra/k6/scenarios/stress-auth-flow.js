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
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { sleepRange } from '../helpers/data.js';

const loginDuration = new Trend('auth_flow_login_duration', true);
const meBeforeRefreshDuration = new Trend('auth_flow_me_before_refresh_duration', true);
const refreshDuration = new Trend('auth_flow_refresh_duration', true);
const meAfterRefreshDuration = new Trend('auth_flow_me_after_refresh_duration', true);

const loginSuccessRate = new Rate('auth_flow_login_success_rate');
const meBeforeRefreshSuccessRate = new Rate('auth_flow_me_before_refresh_success_rate');
const refreshSuccessRate = new Rate('auth_flow_refresh_success_rate');
const meAfterRefreshSuccessRate = new Rate('auth_flow_me_after_refresh_success_rate');
const authFlowErrorRate = new Rate('auth_flow_error_rate');

const totalIterations = new Counter('auth_flow_total_iterations');
const totalLoginAttempts = new Counter('auth_flow_total_login_attempts');

export const options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.20'],
        http_req_duration: ['p(95)<5000'],

        auth_flow_error_rate: ['rate<0.20'],
        auth_flow_me_before_refresh_success_rate: ['rate>0.95'],
        auth_flow_refresh_success_rate: ['rate>0.95'],
        auth_flow_me_after_refresh_success_rate: ['rate>0.95'],

        auth_flow_me_before_refresh_duration: ['p(95)<3000'],
        auth_flow_refresh_duration: ['p(95)<3000'],
        auth_flow_me_after_refresh_duration: ['p(95)<3000'],
    },
};

let initialized = false;

function hasCookie(res, cookieName) {
    return !!res.cookies[cookieName] && res.cookies[cookieName].length > 0;
}

function loginOncePerVu() {
    totalLoginAttempts.add(1);

    const user = pickUser(__VU);

    const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: user.email,
            password: user.password,
        }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_login_once' },
        }
    );

    loginDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
        '[auth-flow] login status 200': (r) => r.status === 200,
        '[auth-flow] accessToken cookie exists': (r) => hasCookie(r, 'accessToken'),
        '[auth-flow] refreshToken cookie exists': (r) => hasCookie(r, 'refreshToken'),
    });

    loginSuccessRate.add(loginOk);

    if (!loginOk) {
        console.log(
            `[auth-flow] login failed: vu=${__VU}, status=${loginRes.status}, body=${loginRes.body}`
        );
        authFlowErrorRate.add(true);
        return false;
    }

    initialized = true;
    authFlowErrorRate.add(false);
    return true;
}

export default function () {
    totalIterations.add(1);

    // VU 최초 1회만 로그인
    if (!initialized) {
        const loginOk = loginOncePerVu();

        if (!loginOk) {
            sleep(sleepRange(500, 1000));
            return;
        }

        sleep(sleepRange(200, 400));
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
        console.log(
            `[auth-flow] me before refresh failed: vu=${__VU}, status=${meBeforeRefreshRes.status}, body=${meBeforeRefreshRes.body}`
        );
        authFlowErrorRate.add(true);

        // 인증이 꼬였으면 다음 iteration에서 다시 로그인 시도
        initialized = false;
        sleep(sleepRange(500, 1000));
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
        '[auth-flow] refreshed accessToken cookie exists': (r) => hasCookie(r, 'accessToken'),
        '[auth-flow] refreshed refreshToken cookie exists': (r) => hasCookie(r, 'refreshToken'),
    });

    refreshSuccessRate.add(refreshOk);

    if (!refreshOk) {
        console.log(
            `[auth-flow] refresh failed: vu=${__VU}, status=${refreshRes.status}, body=${refreshRes.body}`
        );
        authFlowErrorRate.add(true);

        initialized = false;
        sleep(sleepRange(500, 1000));
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
        console.log(
            `[auth-flow] me after refresh failed: vu=${__VU}, status=${meAfterRefreshRes.status}, body=${meAfterRefreshRes.body}`
        );
        authFlowErrorRate.add(true);

        initialized = false;
        sleep(sleepRange(500, 1000));
        return;
    }

    authFlowErrorRate.add(false);

    sleep(sleepRange(300, 700));
}