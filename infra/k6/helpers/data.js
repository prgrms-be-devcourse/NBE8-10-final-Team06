/**
 * 부하 테스트용 공통 데이터 헬퍼
 */

import http from 'k6/http';
import encoding from 'k6/encoding';

// 1×1 투명 PNG (base64) - 파일 업로드 API 테스트용 더미 이미지
const DUMMY_PNG_B64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** 랜덤 정수 [min, max) */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/** 랜덤 문자열 (n자) */
export function randStr(n) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let idx = 0; idx < n; idx++) {
        result += chars[randInt(0, chars.length)];
    }
    return result;
}

/**
 * 게시글 생성 multipart/form-data 페이로드
 *
 * POST /api/posts 는 @RequestPart("request") + @RequestPart("files") 를 요구합니다.
 * k6 http.post()에 이 객체를 그대로 전달하면 Content-Type 이 자동으로
 * multipart/form-data 로 설정됩니다.
 * Authorization 헤더만 별도로 넘기고 Content-Type 은 지정하지 마세요.
 */
export function newPostFormData() {
    const requestJson = JSON.stringify({
        title: `부하테스트 제목 ${randStr(6)}`,
        content: `k6 부하테스트 내용입니다. ${randStr(20)}`,
    });
    const pngBytes = encoding.b64decode(DUMMY_PNG_B64, 'std', 'b');

    return {
        request: http.file(requestJson, 'request.json', 'application/json'),
        files: http.file(pngBytes, 'test.png', 'image/png'),
    };
}

/** 댓글 생성 Payload */
export function newCommentPayload(parentCommentId = null) {
    return {
        content: `테스트 댓글 ${randStr(8)}`,
        parentCommentId,
    };
}

/** 스토리 생성용 FormData 바디 (텍스트 전용) */
export function newStoryFormData() {
    return {
        content: `스토리 테스트 ${randStr(6)}`,
        tagUserIds: '[]',
        mediaType: 'IMAGE',
        thumbnailUrl: 'https://via.placeholder.com/150',
    };
}

/** 시드 유저 nicknames (팔로우 등 조회용) */
export const SEED_NICKNAMES = [
    'test_dev_01',
    'test_dev_02',
    'test_dev_03',
    'test_dev_04',
    'test_dev_05',
];

/** DM 메시지 Payload */
export function newDmPayload() {
    return {
        type: 'TEXT',
        content: `안녕하세요 ${randStr(6)}`,
        thumbnail: null,
    };
}

/** 잠깐 대기 (ms) */
export function sleepRange(minMs, maxMs) {
    return (randInt(minMs, maxMs)) / 1000;
}
