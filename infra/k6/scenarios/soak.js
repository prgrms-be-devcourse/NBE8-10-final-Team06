/**
 * Soak Test - 장시간 안정성 테스트
 *
 * 목적: 메모리 누수, DB 커넥션 고갈, 장시간 부하 시 성능 저하 감지
 * 대상: 중간 부하(30 VU)를 1시간 유지
 *
 * 실행:
 *   k6 run -e BASE_URL=https://devstagram.site scenarios/soak.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { newPostPayload, newCommentPayload, sleepRange } from '../helpers/data.js';

const errorRate = new Rate('custom_error_rate');
const feedDuration = new Trend('custom_feed_duration', true);
const postDuration = new Trend('custom_post_duration', true);
const totalRequests = new Counter('custom_total_requests');

export const options = {
    stages: [
        { duration: '2m', target: 30 },   // ramp-up
        { duration: '60m', target: 30 },  // soak
        { duration: '3m', target: 0 },    // ramp-down
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<3000'],
        custom_error_rate: ['rate<0.05'],
    },
};

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
    if (!headers) { sleep(2); return; }

    // 피드 조회
    group('feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/posts`, { headers, tags: { name: 'feed_get' } });
        feedDuration.add(Date.now() - start);
        totalRequests.add(1);
        const ok = check(res, { '[soak] feed 200': (r) => r.status === 200 });
        errorRate.add(!ok);
    });

    sleep(sleepRange(500, 1500));

    // 게시글 작성 (30% 확률)
    if (Math.random() < 0.3) {
        let postId = null;
        group('post_create', () => {
            const start = Date.now();
            const res = http.post(
                `${BASE_URL}/api/posts`,
                JSON.stringify(newPostPayload()),
                { headers, tags: { name: 'post_create' } }
            );
            postDuration.add(Date.now() - start);
            totalRequests.add(1);
            const ok = check(res, { '[soak] post 201': (r) => r.status === 201 });
            errorRate.add(!ok);
            if (ok) { try { postId = res.json('data'); } catch (_) {} }
        });

        if (postId) {
            sleep(sleepRange(300, 600));
            group('comment', () => {
                const res = http.post(
                    `${BASE_URL}/api/posts/${postId}/comments`,
                    JSON.stringify(newCommentPayload()),
                    { headers, tags: { name: 'comment_create' } }
                );
                totalRequests.add(1);
                check(res, { '[soak] comment 201': (r) => r.status === 201 });
            });
        }
    }

    sleep(sleepRange(1500, 3000));
}
