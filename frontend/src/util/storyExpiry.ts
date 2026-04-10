/** 스토리 뷰어 한 장 최대 재생 시간(ms) — 서버 만료 전까지만 줄어듦 */
export const STORY_VIEWER_SLIDE_MS = 5000;

export function storyExpiresAtMs(expiredAt: string | undefined | null): number | null {
  if (!expiredAt) return null;
  const t = Date.parse(expiredAt);
  return Number.isFinite(t) ? t : null;
}

/** 클라이언트 기준 만료 여부 — API 재조회 전에도 링·목록을 맞추기 위해 사용 */
export function isStoryPastExpiry(expiredAt: string | undefined | null, nowMs = Date.now()): boolean {
  const end = storyExpiresAtMs(expiredAt);
  return end != null && nowMs >= end;
}

/** API가 만료분을 섞어내도 진행 바·썸네일 개수를 맞추기 위한 클라 방어 필터 */
export function filterStoriesNotPastExpiry<T extends { expiredAt: string }>(
  items: T[] | null | undefined,
  nowMs = Date.now()
): T[] {
  if (!items?.length) return [];
  return items.filter((s) => !isStoryPastExpiry(s.expiredAt, nowMs));
}

export function slideDurationMs(expiredAt: string | undefined | null, nowMs = Date.now()): number {
  const end = storyExpiresAtMs(expiredAt);
  if (end == null) return STORY_VIEWER_SLIDE_MS;
  const untilExpiry = end - nowMs;
  if (untilExpiry <= 0) return 0;
  return Math.min(STORY_VIEWER_SLIDE_MS, untilExpiry);
}
