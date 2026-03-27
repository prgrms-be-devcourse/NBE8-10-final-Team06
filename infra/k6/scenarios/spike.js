/**
 * Spike Test - 갑작스러운 트래픽 폭증 테스트
 *
 * 목적: 트래픽이 순간적으로 폭증할 때 시스템이 버티고 회복하는지 확인
 * 시나리오: 행사/이벤트 알림 직후 피드/스토리 동시 접속 폭증 상황 가정
 *
 * 단계:
 *   0→10 VU   (30초)  → 준비
 *   10 VU     (1분)   → 정상 상태
 *   10→300 VU (30초)  → 스파이크!
 *   300 VU    (2분)   → 스파이크 유지
 *   300→10 VU (30초)  → 회복
 *   10 VU     (3분)   → 회복 확인
 *   10→0 VU   (30초)  → 종료
 *
 * 실행:
 *   k6 run -e BASE_URL=https://devstagram.site scenarios/spike.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { sleepRange } from '../helpers/data.js';

const errorRate = new Rate('custom_error_rate');
const feedDuration = new Trend('custom_feed_duration', true);
const storyDuration = new Trend('custom_story_duration', true);
const totalRequests = new Counter('custom_total_requests');

export const options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 300 },   // 스파이크 시작
        { duration: '2m', target: 300 },    // 스파이크 유지
        { duration: '30s', target: 10 },    // 회복
        { duration: '3m', target: 10 },     // 회복 확인
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.15'],
        http_req_duration: ['p(95)<8000'],
        custom_error_rate: ['rate<0.15'],
    },
};

// VU당 토큰 캐시
const tokenCache = {};

function getToken(user) {
    if (tokenCache[__VU]) return tokenCache[__VU];

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
    tokenCache[__VU] = headers;
    return headers;
}

export default function () {
    const user = pickUser(__VU);
    const headers = getToken(user);
    if (!headers) {
        sleep(0.5);
        return;
    }

    // 스파이크 시 가장 많이 몰리는 패턴: 피드 & 스토리 조회
    group('spike_feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/posts?size=10`, {
            headers,
            tags: { name: 'spike_feed' },
        });
        feedDuration.add(Date.now() - start);
        totalRequests.add(1);
        const ok = check(res, {
            '[spike] feed ok': (r) => r.status === 200 || r.status === 503,
        });
        errorRate.add(res.status >= 500 && res.status !== 503);
    });

    sleep(sleepRange(100, 300));

    group('spike_story_feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/story/feed`, {
            headers,
            tags: { name: 'spike_story' },
        });
        storyDuration.add(Date.now() - start);
        totalRequests.add(1);
        check(res, {
            '[spike] story ok': (r) => r.status === 200 || r.status === 503,
        });
    });

    sleep(sleepRange(200, 500));
}
