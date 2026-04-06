/** 탈퇴 등으로 닉네임이 비어 있을 때 DM·방 정보 UI 에서 쓰는 표시명 */
export const DM_UNKNOWN_PEER_NICKNAME = '알 수 없음';

/** 서버가 탈퇴 계정 닉네임을 `탈퇴한 사용자_{userId}` 형태로 바꿔 두는 경우와 동일 패턴 */
const WITHDRAWN_PLACEHOLDER_NICKNAME = /^탈퇴한 사용자_\d+$/;

export function isWithdrawnPlaceholderNickname(nickname: string | null | undefined): boolean {
  const t = nickname?.trim();
  if (!t) return false;
  return WITHDRAWN_PLACEHOLDER_NICKNAME.test(t);
}

export function formatDmPeerNickname(nickname: string | null | undefined): string {
  const t = nickname?.trim();
  if (!t || t.length === 0) return DM_UNKNOWN_PEER_NICKNAME;
  if (WITHDRAWN_PLACEHOLDER_NICKNAME.test(t)) return DM_UNKNOWN_PEER_NICKNAME;
  return t;
}
