/**
 * DM 텍스트 말풍선 스타일 (백엔드 DmMessageResponse.senderId 와 로그인 사용자 id 비교로 좌우·색 구분).
 * - 상대: 왼쪽 정렬 + 회색
 * - 본인: 오른쪽 정렬 + 파랑
 */
export const DM_BUBBLE_PEER = {
  backgroundColor: '#efefef',
  color: '#262626',
  border: 'none',
} as const;

export const DM_BUBBLE_MINE = {
  backgroundColor: '#0095f6',
  color: '#fff',
  border: 'none',
} as const;
