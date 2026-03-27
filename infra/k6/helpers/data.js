/**
 * 부하 테스트용 공통 데이터 헬퍼
 */

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

/** 게시글 생성 Payload */
export function newPostPayload() {
    return {
        title: `부하테스트 제목 ${randStr(6)}`,
        content: `k6 부하테스트 내용입니다. ${randStr(20)}`,
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
