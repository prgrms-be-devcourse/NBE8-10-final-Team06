import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, pickUser, loginWithCookies } from '../helpers/auth.js';
import { sleepRange } from '../helpers/data.js';

// 커스텀 메트릭
const loginDuration = new Trend('user_flow_login_duration', true);
const meDuration = new Trend('user_flow_me_duration', true);
const recommendDuration = new Trend('user_flow_recommend_duration', true);
const searchDuration = new Trend('user_flow_search_duration', true);
const profileDuration = new Trend('user_flow_profile_duration', true);
const followStatusDuration = new Trend('user_flow_follow_status_duration', true);
const followCountDuration = new Trend('user_flow_follow_count_duration', true);
const followListDuration = new Trend('user_flow_follow_list_duration', true);

const errorRate = new Rate('user_flow_error_rate');
const totalRequests = new Counter('user_flow_total_requests');

export const options = {
    // iteration이 바뀌어도 쿠키를 유지해야 로그인 후 조회 흐름을 자연스럽게 볼 수 있음
    noCookiesReset: true,
    stages: [
        { duration: '2m', target: 30 },
        { duration: '3m', target: 60 },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 150 },
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<3000'],
        user_flow_error_rate: ['rate<0.05'],
        user_flow_login_duration: ['p(95)<1500'],
        user_flow_profile_duration: ['p(95)<2000'],
        user_flow_recommend_duration: ['p(95)<2000'],
        user_flow_search_duration: ['p(95)<2000'],
    },
};

// 테스트용 닉네임/ID 매핑
// 주의: id는 실제 DB의 user id와 맞아야 함
const TEST_TARGETS = [
    { id: 12, nickname: 'k6test01' },
    { id: 13, nickname: 'k6test02' },
    { id: 15, nickname: 'k6test04' },
    { id: 16, nickname: 'k6test05' },
    { id: 17, nickname: 'k6test06' },
    { id: 18, nickname: 'k6test07' },
    { id: 19, nickname: 'k6test08' },
    { id: 20, nickname: 'k6test09' },
    { id: 21, nickname: 'k6test10' },
    { id: 23, nickname: 'k6test011' },
];

let vuState = {
    loggedIn: false,
};

function pickTarget(vuId) {
    return TEST_TARGETS[(vuId - 1) % TEST_TARGETS.length];
}

function doLogin() {
    const user = pickUser(__VU);
    const { res, ok } = loginWithCookies(user.email, user.password);

    loginDuration.add(res.timings.duration);
    totalRequests.add(1);
    errorRate.add(!ok);

    if (!ok) {
        console.log(
            `[user-flow] login failed: vu=${__VU}, email=${user.email}, status=${res.status}, body=${res.body}`
        );
        vuState.loggedIn = false;
        return false;
    }

    vuState.loggedIn = true;
    return true;
}

function ensureLogin() {
    if (vuState.loggedIn) {
        return true;
    }
    return doLogin();
}

export default function () {
    if (!ensureLogin()) {
        sleep(sleepRange(1000, 2000));
        return;
    }

    const target = pickTarget(__VU);

    group('auth_me', () => {
        const res = http.get(`${BASE_URL}/api/auth/me`, {
            tags: { name: 'auth_me' },
        });

        meDuration.add(res.timings.duration);
        totalRequests.add(1);

        const ok = check(res, {
            '[user-flow] me 200': (r) => r.status === 200,
        });

        errorRate.add(!ok);

        if (!ok) {
            vuState.loggedIn = false;
        }
    });

    sleep(sleepRange(200, 500));

    group('user_recommendations', () => {
        const res = http.get(`${BASE_URL}/api/users/recommendations`, {
            tags: { name: 'user_recommendations' },
        });

        recommendDuration.add(res.timings.duration);
        totalRequests.add(1);

        const ok = check(res, {
            '[user-flow] recommendations 200': (r) => r.status === 200,
        });

        errorRate.add(!ok);
    });

    sleep(sleepRange(200, 500));

    group('user_search', () => {
        const res = http.get(`${BASE_URL}/api/users/search?keyword=k6test`, {
            tags: { name: 'user_search' },
        });

        searchDuration.add(res.timings.duration);
        totalRequests.add(1);

        const ok = check(res, {
            '[user-flow] search 200': (r) => r.status === 200,
        });

        errorRate.add(!ok);
    });

    sleep(sleepRange(200, 500));

    group('user_profile', () => {
        const res = http.get(`${BASE_URL}/api/users/${target.nickname}/profile`, {
            tags: { name: 'user_profile' },
        });

        profileDuration.add(res.timings.duration);
        totalRequests.add(1);

        const ok = check(res, {
            '[user-flow] profile 200': (r) => r.status === 200,
        });

        errorRate.add(!ok);
    });

    sleep(sleepRange(200, 500));

    group('follow_status', () => {
        const res = http.get(`${BASE_URL}/api/follows/${target.id}/status`, {
            tags: { name: 'follow_status' },
        });

        followStatusDuration.add(res.timings.duration);
        totalRequests.add(1);

        const ok = check(res, {
            '[user-flow] follow status 200': (r) => r.status === 200,
        });

        errorRate.add(!ok);
    });

    sleep(sleepRange(200, 500));

    group('follow_counts', () => {
        const followerCountRes = http.get(`${BASE_URL}/api/follows/${target.id}/follower-count`, {
            tags: { name: 'follower_count' },
        });

        const followingCountRes = http.get(`${BASE_URL}/api/follows/${target.id}/following-count`, {
            tags: { name: 'following_count' },
        });

        followCountDuration.add(followerCountRes.timings.duration);
        followCountDuration.add(followingCountRes.timings.duration);
        totalRequests.add(2);

        const ok1 = check(followerCountRes, {
            '[user-flow] follower count 200': (r) => r.status === 200,
        });

        const ok2 = check(followingCountRes, {
            '[user-flow] following count 200': (r) => r.status === 200,
        });

        errorRate.add(!(ok1 && ok2));
    });

    sleep(sleepRange(200, 500));

    group('follow_lists', () => {
        const followersRes = http.get(`${BASE_URL}/api/follows/${target.id}/followers`, {
            tags: { name: 'followers_list' },
        });

        const followingsRes = http.get(`${BASE_URL}/api/follows/${target.id}/followings`, {
            tags: { name: 'followings_list' },
        });

        followListDuration.add(followersRes.timings.duration);
        followListDuration.add(followingsRes.timings.duration);
        totalRequests.add(2);

        const ok1 = check(followersRes, {
            '[user-flow] followers list 200': (r) => r.status === 200,
        });

        const ok2 = check(followingsRes, {
            '[user-flow] followings list 200': (r) => r.status === 200,
        });

        errorRate.add(!(ok1 && ok2));
    });

    sleep(sleepRange(800, 1500));
}