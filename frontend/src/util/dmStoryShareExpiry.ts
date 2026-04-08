/**
 * DM 공유 스토리 본문 `devstagram://story?...&v=타임스탬프` 기준 24시간 경과 추정.
 * 서버 `valid` 와 함께 쓰면 만료 UI·네비게이션 차단에 일관되게 사용할 수 있다.
 */
export function isDmSharedStoryContentExpired(content: string): boolean {
  const match = content.match(/v=(\d+)/);
  if (!match) return false;
  const createdTime = parseInt(match[1], 10);
  if (!Number.isFinite(createdTime)) return false;
  const now = Date.now();
  const createdMillis = createdTime < 10000000000 ? createdTime * 1000 : createdTime;
  return now - createdMillis > 24 * 60 * 60 * 1000;
}
