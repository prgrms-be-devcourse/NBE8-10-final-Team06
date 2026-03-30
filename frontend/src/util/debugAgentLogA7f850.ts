/** Cursor 디버그 세션 a7f850 — ingest + (dev) Vite 가 리포 루트 `debug-a7f850.log`에 기록 + sessionStorage */
export function debugAgentLogA7f850(payload: Record<string, unknown>): void {
  const body = JSON.stringify({ sessionId: 'a7f850', timestamp: Date.now(), ...payload });
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    void fetch(`${window.location.origin}/__debug/a7f850`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  }
  fetch('http://127.0.0.1:7895/ingest/39e8840a-d8da-47b2-a626-4b296d79ccf8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a7f850' },
    body,
  }).catch(() => {});
  try {
    if (typeof sessionStorage === 'undefined') return;
    const key = 'a7f850-ndjson';
    const lines = (sessionStorage.getItem(key) ?? '').split('\n').filter((x) => x.length > 0);
    lines.push(body);
    sessionStorage.setItem(key, lines.slice(-200).join('\n'));
  } catch {
    /* quota */
  }
}
