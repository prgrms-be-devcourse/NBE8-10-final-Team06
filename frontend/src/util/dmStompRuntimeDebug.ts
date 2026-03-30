/**
 * 디버그 세션 전용 — 런타임 증거 수집. 성공 검증 후 제거 예정.
 * 토큰·본문 전문·PII 는 넣지 않는다.
 */

export function dmStompDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  // #region agent log
  fetch('http://127.0.0.1:7895/ingest/39e8840a-d8da-47b2-a626-4b296d79ccf8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8efbc2' },
    body: JSON.stringify({
      sessionId: '8efbc2',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
