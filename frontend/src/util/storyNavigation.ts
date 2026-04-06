/** 스토리 뷰어 진입 시 `navigate(..., { state })`에 넣는 키 — 닫기·피드 종료 시 복귀 경로 */
export const STORY_FROM_STATE_KEY = 'storyFrom' as const;

export type StoryLocationState = { [STORY_FROM_STATE_KEY]?: string };

/** 라우터 `location.state`에서 복귀 경로 추출 (오픈 리다이렉트 방지: 내부 경로만) */
export function normalizeStoryExitPath(state: unknown): string {
  if (!state || typeof state !== 'object') return '/';
  const from = (state as Record<string, unknown>)[STORY_FROM_STATE_KEY];
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return '/';
  return from;
}
