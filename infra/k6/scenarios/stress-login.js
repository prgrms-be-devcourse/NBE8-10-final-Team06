/**
 * Stress Test - 로그인 API 집중 부하 (짧은 버전)
 *
 * 목적:
 * - 로그인 API 병목 후보를 빠르게 확인
 * - userQueryMs / passwordCheckMs / tokenCreateMs 로그 수집
 *
 * 실행:
 *   k6 run -e BASE_URL=http://localhost:8080 infra/k6/scenarios/stress-login.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { sleepRange } from '../helpers/data.js';

const errorRate = new Rate('custom_error_rate');
const loginDuration = new Trend('custom_login_duration', true);
const totalRequests = new Counter('custom_total_requests');

export const options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.20'],
        http_req_duration: ['p(95)<10000'],
        custom_error_rate: ['rate<0.20'],
        custom_login_duration: ['p(95)<10000'],
    },
};

export default function () {
    const user = pickUser(__VU);

    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: user.email,
            password: user.password,
        }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'auth_login' },
        }
    );

    loginDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
        '[stress-login] login 200': (r) => r.status === 200,
        '[stress-login] accessToken exists': (r) =>
            !!r.cookies['accessToken'] && r.cookies['accessToken'].length > 0,
    });

    errorRate.add(!ok);

    sleep(sleepRange(200, 600));
}