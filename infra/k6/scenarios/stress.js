/**
 * Stress Test - 한계 부하까지 점진적으로 증가
 *
 * 목적: 시스템이 무너지기 직전의 최대 처리 용량(breaking point) 파악
 * 주요 API: 피드 조회(읽기 집중), 게시글 작성(쓰기 집중)
 *
 * 단계:
 *   0→100 VU  (5분)  → 보통 수준
 *   100→200 VU (5분) → 높은 부하
 *   200→300 VU (5분) → 과부하
 *   300→400 VU (5분) → 극한 부하
 *   400→0 VU  (3분)  → 회복 확인
 *
 * 실행:
 *   k6 run -e BASE_URL=https://devstagram.site scenarios/stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { newPostPayload, sleepRange } from '../helpers/data.js';

const errorRate = new Rate('custom_error_rate');
const feedDuration = new Trend('custom_feed_duration', true);
const postDuration = new Trend('custom_post_duration', true);
const totalRequests = new Counter('custom_total_requests');

export const options = {
    stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '3m', target: 0 },   // recovery
    ],
    thresholds: {
        // stress test는 임계값 위반을 허용 (한계 탐색 목적)
        http_req_failed: ['rate<0.20'],
        http_req_duration: ['p(95)<10000'],
        custom_error_rate: ['rate<0.20'],
    },
};

// 세션 캐시: VU당 토큰 1회만 획득
const sessionCache = {};

function getSession(user) {
    if (sessionCache[__VU]) return sessionCache[__VU];

    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: user.email, password: user.password }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
    );
    totalRequests.add(1);

    if (res.status !== 200 || !res.cookies['accessToken']) return null;
    const headers = {
        Authorization: `Bearer ${res.cookies['accessToken'][0].value}`,
        'Content-Type': 'application/json',
    };
    sessionCache[__VU] = headers;
    return headers;
}

export default function () {
    const user = pickUser(__VU);
    const headers = getSession(user);
    if (!headers) {
        sleep(1);
        return;
    }

    // 70% 읽기 / 30% 쓰기 비율
    if (Math.random() < 0.70) {
        // ── 읽기: 피드 조회 ──
        group('read_feed', () => {
            const start = Date.now();
            const res = http.get(`${BASE_URL}/api/posts?size=10`, {
                headers,
                tags: { name: 'feed_get' },
            });
            feedDuration.add(Date.now() - start);
            totalRequests.add(1);
            const ok = check(res, { '[stress] feed 200': (r) => r.status === 200 });
            errorRate.add(!ok);
        });
    } else {
        // ── 쓰기: 게시글 생성 ──
        group('write_post', () => {
            const start = Date.now();
            const res = http.post(
                `${BASE_URL}/api/posts`,
                JSON.stringify(newPostPayload()),
                { headers, tags: { name: 'post_create' } }
            );
            postDuration.add(Date.now() - start);
            totalRequests.add(1);
            const ok = check(res, { '[stress] post create ≤201': (r) => r.status <= 201 });
            errorRate.add(!ok);
        });
    }

    // 스트레스 테스트는 짧은 대기 (빠르게 요청 누적)
    sleep(sleepRange(200, 600));
}
