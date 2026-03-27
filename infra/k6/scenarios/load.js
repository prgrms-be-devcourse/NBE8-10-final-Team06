/**
 * Load Test - 예상 정상 트래픽 부하 테스트
 *
 * 목적: 실제 운영 수준의 동시 사용자 처리 성능 측정
 * 시나리오: 피드/게시글/댓글/스토리/팔로우를 복합적으로 요청
 *
 * 단계:
 *   0→20 VU  (2분 ramp-up)
 *   20 VU    (5분 sustained)
 *   20→50 VU (2분 ramp-up)
 *   50 VU    (10분 sustained)
 *   50→0 VU  (2분 ramp-down)
 *
 * 실행:
 *   k6 run -e BASE_URL=https://devstagram.site scenarios/load.js
 *   k6 run -e BASE_URL=https://devstagram.site -o influxdb=http://influxdb:8086/k6 scenarios/load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { pickUser, BASE_URL } from '../helpers/auth.js';
import { newPostPayload, newCommentPayload, sleepRange } from '../helpers/data.js';

// ──── 커스텀 메트릭 ────
const loginDuration = new Trend('custom_login_duration', true);
const feedDuration = new Trend('custom_feed_duration', true);
const postDuration = new Trend('custom_post_duration', true);
const commentDuration = new Trend('custom_comment_duration', true);
const storyDuration = new Trend('custom_story_duration', true);
const followDuration = new Trend('custom_follow_duration', true);
const dmDuration = new Trend('custom_dm_duration', true);
const errorRate = new Rate('custom_error_rate');
const totalRequests = new Counter('custom_total_requests');

// ──── 옵션 ────
export const options = {
    stages: [
        { duration: '2m', target: 20 },   // ramp-up
        { duration: '5m', target: 20 },   // warm-up steady
        { duration: '2m', target: 50 },   // ramp-up to load
        { duration: '10m', target: 50 },  // sustained load
        { duration: '2m', target: 0 },    // ramp-down
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],        // 오류율 5% 미만
        http_req_duration: ['p(95)<3000', 'p(99)<5000'],
        custom_error_rate: ['rate<0.05'],
        custom_feed_duration: ['p(95)<2000'],
        custom_login_duration: ['p(95)<1500'],
    },
};

// ──── 공통 로그인 ────
function doLogin(user) {
    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: user.email, password: user.password }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
    );
    loginDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
        '[load] login 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);

    if (!ok || !res.cookies['accessToken']) return null;
    return {
        Authorization: `Bearer ${res.cookies['accessToken'][0].value}`,
        'Content-Type': 'application/json',
    };
}

// ──── 시나리오 본문 ────
export default function () {
    const user = pickUser(__VU);
    const headers = doLogin(user);
    if (!headers) return;

    sleep(sleepRange(300, 800));

    // ── 피드 조회 ──
    group('feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/posts?size=10`, {
            headers,
            tags: { name: 'feed_get' },
        });
        feedDuration.add(Date.now() - start);
        totalRequests.add(1);
        const ok = check(res, { '[load] feed 200': (r) => r.status === 200 });
        errorRate.add(!ok);
    });

    sleep(sleepRange(500, 1500));

    // ── 스토리 피드 조회 ──
    group('story_feed', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/story/feed`, {
            headers,
            tags: { name: 'story_feed' },
        });
        storyDuration.add(Date.now() - start);
        totalRequests.add(1);
        check(res, { '[load] story feed 200': (r) => r.status === 200 });
    });

    sleep(sleepRange(300, 800));

    // ── 게시글 생성 + 댓글 달기 (50% 확률) ──
    if (Math.random() < 0.5) {
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
            const ok = check(res, { '[load] post create 201': (r) => r.status === 201 });
            errorRate.add(!ok);
            if (ok) {
                try { postId = res.json('data'); } catch (_) {}
            }
        });

        sleep(sleepRange(200, 500));

        if (postId) {
            group('comment_create', () => {
                const start = Date.now();
                const res = http.post(
                    `${BASE_URL}/api/posts/${postId}/comments`,
                    JSON.stringify(newCommentPayload()),
                    { headers, tags: { name: 'comment_create' } }
                );
                commentDuration.add(Date.now() - start);
                totalRequests.add(1);
                const ok = check(res, { '[load] comment 201': (r) => r.status === 201 });
                errorRate.add(!ok);
            });

            sleep(sleepRange(200, 500));

            // 게시글 좋아요
            group('post_like', () => {
                const res = http.post(`${BASE_URL}/api/posts/${postId}/like`, null, {
                    headers,
                    tags: { name: 'post_like' },
                });
                totalRequests.add(1);
                check(res, { '[load] like 200': (r) => r.status === 200 });
            });
        }
    }

    sleep(sleepRange(500, 1000));

    // ── DM 방 목록 조회 (40% 확률) ──
    if (Math.random() < 0.4) {
        group('dm_rooms', () => {
            const start = Date.now();
            const res = http.get(`${BASE_URL}/api/dm/rooms`, {
                headers,
                tags: { name: 'dm_rooms' },
            });
            dmDuration.add(Date.now() - start);
            totalRequests.add(1);
            check(res, { '[load] dm rooms 200': (r) => r.status === 200 });
        });
    }

    sleep(sleepRange(500, 1500));

    // ── 팔로잉 목록 조회 ──
    group('follow_list', () => {
        const start = Date.now();
        // 자신의 팔로잉 목록 조회 (userId는 1~10 순환)
        const targetId = (__VU % 10) + 1;
        const res = http.get(`${BASE_URL}/api/follows/${targetId}/followings`, {
            headers,
            tags: { name: 'follow_list' },
        });
        followDuration.add(Date.now() - start);
        totalRequests.add(1);
        check(res, { '[load] follow list 200': (r) => r.status === 200 });
    });

    sleep(sleepRange(1000, 2000));
}
