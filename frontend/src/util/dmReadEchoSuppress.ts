/**
 * STOMP `/topic/dm.{roomId}` 에는 본인이 보낸 read 처리 브로드캐스트도 다시 도착한다.
 * 그대로 `lastReadIdByOpponent` 에 반영하면 상대가 읽은 것처럼 오인되므로,
 * 직전에 보낸 read messageId 에 대한 첫 에코만 무시한다.
 */
const selfReadSentAt = new Map<number, number>();
/** 짧게: 에코만 걸러야 함. 길면 상대 read 가 같은 messageId 로 도착할 때까지 창이 열려 오인 억제됨(로그로 확인) */
const ECHO_WINDOW_MS = 120;

export function resetDmReadEchoSuppress(): void {
  selfReadSentAt.clear();
}

export function notifyDmSelfReadSent(messageId: number): void {
  if (!Number.isFinite(messageId) || messageId <= 0) return;
  /** 동일 id 로 STOMP read 를 반복 전송할 때마다 시각을 갱신하면 상대 read 가 끝없이 억제됨 */
  if (selfReadSentAt.has(messageId)) return;
  const now = Date.now();
  selfReadSentAt.set(messageId, now);
  for (const [id, t] of selfReadSentAt) {
    if (now - t > ECHO_WINDOW_MS * 2) selfReadSentAt.delete(id);
  }
}

/** true 이면 이 read 이벤트는 본인 에코로 보고 상대 읽음 처리에 쓰지 않는다 */
export function consumeIfDmSelfReadEcho(messageId: number): boolean {
  if (!Number.isFinite(messageId) || messageId <= 0) return false;
  const sentAt = selfReadSentAt.get(messageId);
  if (sentAt == null) return false;
  const age = Date.now() - sentAt;
  if (age > ECHO_WINDOW_MS) {
    selfReadSentAt.delete(messageId);
    return false;
  }
  selfReadSentAt.delete(messageId);
  return true;
}
