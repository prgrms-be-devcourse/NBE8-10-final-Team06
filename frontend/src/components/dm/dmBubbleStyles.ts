/**
 * DM 텍스트 말풍선 스타일 (백엔드 DmMessageResponse.senderId 와 로그인 사용자 id 비교로 좌우·색 구분).
 * 참고: 일반 Spring+React 채팅 UI — 수신은 밝은 회색·왼쪽, 발신은 강조색·오른쪽.
 */
export const DM_BUBBLE_PEER = {
  backgroundColor: '#efefef',
  color: '#262626',
  border: '1px solid #e6e6e6',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
} as const;

export const DM_BUBBLE_MINE = {
  backgroundColor: '#0095f6',
  color: '#fff',
  border: 'none',
  boxShadow: '0 1px 3px rgba(0, 149, 246, 0.35)',
} as const;
