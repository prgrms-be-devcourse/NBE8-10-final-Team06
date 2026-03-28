/**
 * DM 토픽 `/topic/dm.{roomId}` STOMP 본문 정규화.
 * - `message`: 서버가 `WebSocketEventPayload` 형태 `{ type, data }` 로 전송.
 * - `typing` / `read`: 서버가 평면 `{ type, userId?, status?, messageId?, ... }` 로 전송.
 * 두 형태를 모두 수용해 기존·향후 응답에 영향 없이 동일 UI 로직을 쓴다.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** typing 이벤트에서 userId·status 추출 (data 래핑 또는 평면) */
export function getTypingFieldsFromDmEvent(event: unknown): { userId: number; status: string } | null {
  if (!isRecord(event) || event.type !== 'typing') return null;

  const nested = event.data;
  if (isRecord(nested) && nested.userId != null && nested.status != null) {
    const userId = Number(nested.userId);
    const status = String(nested.status);
    if (Number.isFinite(userId) && status) return { userId, status };
  }

  if (event.userId != null && event.status != null) {
    const userId = Number(event.userId);
    const status = String(event.status);
    if (Number.isFinite(userId) && status) return { userId, status };
  }

  return null;
}

/** read 이벤트에서 messageId 추출 (data 래핑 또는 평면) */
export function getReadMessageIdFromDmEvent(event: unknown): number | null {
  if (!isRecord(event) || event.type !== 'read') return null;

  const nested = event.data;
  if (isRecord(nested) && nested.messageId != null) {
    const n = Number(nested.messageId);
    return Number.isFinite(n) ? n : null;
  }

  if (event.messageId != null) {
    const n = Number(event.messageId);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}
