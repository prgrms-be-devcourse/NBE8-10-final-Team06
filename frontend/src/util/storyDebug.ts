import { isAxiosError } from 'axios';

const TAG = '[Story]';

/** 개발 모드 또는 `localStorage.debugStory = '1'` 일 때만 상세 흐름 로그 */
export function isStoryDebugVerbose(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('debugStory') === '1';
  } catch {
    return false;
  }
}

export function storyLogVerbose(phase: string, data?: Record<string, unknown>): void {
  if (!isStoryDebugVerbose()) return;
  if (data !== undefined) console.info(TAG, phase, data);
  else console.info(TAG, phase);
}

/**
 * 목록 조회·시청 기록 등 HTTP 실패 시 항상 출력 — 네트워크 탭 없이 404·URL 오타 원인 추적용.
 * (성공 경로는 `storyLogVerbose`만 사용)
 */
/** 빈 목록·잘못된 라우트 등 사용자 이슈 추적용 — 성공 시에는 호출하지 않음 */
export function storyWarnAlways(phase: string, data: Record<string, unknown>): void {
  console.warn(TAG, phase, data);
}

export function storyLogRequestFailed(operation: string, err: unknown): void {
  if (isAxiosError(err)) {
    const cfg = err.config;
    const fullUrl =
      cfg?.baseURL != null ? `${String(cfg.baseURL).replace(/\/$/, '')}${cfg.url ?? ''}` : cfg?.url;
    console.warn(TAG, operation, 'HTTP 실패', {
      message: err.message,
      status: err.response?.status,
      method: cfg?.method,
      url: fullUrl,
      body: err.response?.data,
    });
  } else {
    console.warn(TAG, operation, '실패', err);
  }
}
