/**
 * Smoke Test - 최소 부하로 핵심 API 동작 검증
 *
 * 목적: 배포 직후 기본 기능이 정상 동작하는지 빠르게 확인
 * 대상: 1 VU × 1분, 오류 0% 목표
 *
 * 실행:
 *   k6 run -e BASE_URL=https://devstagram.site scenarios/smoke.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { getAuthHeaders, pickUser, BASE_URL } from '../helpers/auth.js';
import { newPostPayload, newCommentPayload } from '../helpers/data.js';

// ──── 커스텀 메트릭 ────
const loginDuration = new Trend('custom_login_duration', true);
const feedDuration = new Trend('custom_feed_duration', true);
const postCreateDuration = new Trend('custom_post_create_duration', true);
const errorRate = new Rate('custom_error_rate');
const requestCount = new Counter('custom_request_count');

// ──── 옵션 ────
export const options = {
    vus: 1,
    duration: '1m',
    thresholds: {
        http_req_failed: ['rate<0.01'],        // 오류율 1% 미만
        http_req_duration: ['p(95)<2000'],     // 95% 응답시간 2초 이내
        custom_error_rate: ['rate<0.01'],
    },
};

// ──── 시나리오 본문 ────
export default function () {
    const user = pickUser(__VU);
    let authHeaders = null;
    let createdPostId = null;
    let createdCommentId = null;

    // 1. 로그인
    group('01_auth', () => {
        const start = Date.now();
        const res = http.post(
            `${BASE_URL}/api/auth/login`,
            JSON.stringify({ email: user.email, password: user.password }),
            { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
        );
        loginDuration.add(Date.now() - start);
        requestCount.add(1);

        const ok = check(res, {
            '[smoke] login 200': (r) => r.status === 200,
            '[smoke] login has token': (r) => {
                try {
                    return r.cookies['accessToken'] !== undefined;
                } catch (_) {
                    return false;
                }
            },
        });
        errorRate.add(!ok);

        if (ok && res.cookies['accessToken']) {
            authHeaders = {
                Authorization: `Bearer ${res.cookies['accessToken'][0].value}`,
                'Content-Type': 'application/json',
            };
        }
    });

    if (!authHeaders) return;
    sleep(0.5);

    // 2. 피드 조회
    group('02_feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/posts`, {
            headers: authHeaders,
            tags: { name: 'feed_get' },
        });
        feedDuration.add(Date.now() - start);
        requestCount.add(1);

        const ok = check(res, {
            '[smoke] feed 200': (r) => r.status === 200,
            '[smoke] feed has data': (r) => r.json('data') !== null,
        });
        errorRate.add(!ok);
    });

    sleep(0.5);

    // 3. 게시글 작성
    group('03_post_create', () => {
        const start = Date.now();
        const res = http.post(
            `${BASE_URL}/api/posts`,
            JSON.stringify(newPostPayload()),
            { headers: authHeaders, tags: { name: 'post_create' } }
        );
        postCreateDuration.add(Date.now() - start);
        requestCount.add(1);

        const ok = check(res, {
            '[smoke] post create 201': (r) => r.status === 201,
        });
        errorRate.add(!ok);

        if (ok) {
            try {
                createdPostId = res.json('data');
            } catch (_) {}
        }
    });

    sleep(0.5);

    // 4. 게시글 상세 조회
    if (createdPostId) {
        group('04_post_detail', () => {
            const res = http.get(`${BASE_URL}/api/posts/${createdPostId}`, {
                headers: authHeaders,
                tags: { name: 'post_detail' },
            });
            requestCount.add(1);
            const ok = check(res, {
                '[smoke] post detail 200': (r) => r.status === 200,
            });
            errorRate.add(!ok);
        });
        sleep(0.5);

        // 5. 댓글 작성
        group('05_comment_create', () => {
            const res = http.post(
                `${BASE_URL}/api/posts/${createdPostId}/comments`,
                JSON.stringify(newCommentPayload()),
                { headers: authHeaders, tags: { name: 'comment_create' } }
            );
            requestCount.add(1);
            const ok = check(res, {
                '[smoke] comment create 201': (r) => r.status === 201,
            });
            errorRate.add(!ok);
            if (ok) {
                try {
                    createdCommentId = res.json('data');
                } catch (_) {}
            }
        });
        sleep(0.5);

        // 6. 게시글 삭제 (정리)
        group('06_post_delete', () => {
            const res = http.del(`${BASE_URL}/api/posts/${createdPostId}`, null, {
                headers: authHeaders,
                tags: { name: 'post_delete' },
            });
            requestCount.add(1);
            const ok = check(res, {
                '[smoke] post delete 200': (r) => r.status === 200,
            });
            errorRate.add(!ok);
        });
    }

    sleep(1);
}
