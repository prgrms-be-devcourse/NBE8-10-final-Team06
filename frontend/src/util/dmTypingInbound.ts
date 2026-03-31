/**
 * `/topic/dm.{roomId}` 수신 본문에서 typing 이벤트만 안정적으로 꺼낸다.
 * - 배열이면 모든 객체 요소를 순회.
 * - `data` 중첩·roomId+userId+status 평면 등 서버/프록시 변형 폴백.
 */

import {
  coercePositiveUserIdForTyping,
  coerceStompTopicEventRecord,
  getTypingFieldsFromDmEvent,
  parseDmWebSocketJson,
  resolveDmTopicEventKind,
} from './dmWebSocketPayload';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickTypingUserId(r: Record<string, unknown>): number | null {
  const keys = [
    'userId',
    'user_id',
    'senderId',
    'sender_id',
    'fromUserId',
    'from_user_id',
    'memberId',
    'member_id',
  ] as const;
  for (const k of keys) {
    const raw = r[k];
    if (raw == null || raw === '') continue;
    const n = coercePositiveUserIdForTyping(raw);
    if (n != null) return n;
  }
  return null;
}

function rawToStatusString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (isRecord(raw) && typeof raw.name === 'string') return raw.name;
  return null;
}

function pickTypingStatus(r: Record<string, unknown>): 'start' | 'stop' | null {
  const s = r.status ?? r.typingStatus ?? r.typing_status;
  const str = rawToStatusString(s) ?? (s != null && typeof s !== 'object' ? String(s) : null);
  if (str == null) return null;
  const sl = str.trim().toLowerCase();
  if (sl === 'start' || sl === 'stop') return sl;
  return null;
}

function tryTypingFromRoot(root: Record<string, unknown>): {
  userId: number;
  status: 'start' | 'stop';
} | null {
  const primary = getTypingFieldsFromDmEvent(root);
  if (primary) return primary;

  /** API 래퍼 `{ data: TypingWsPayload }` · RsData 등 한 겹 `data` 만 있고 루트에 type 이 없는 경우 */
  const dataField = root.data;
  if (isRecord(dataField)) {
    const fromData = getTypingFieldsFromDmEvent(dataField);
    if (fromData) return fromData;
  }

  const kind = resolveDmTopicEventKind(root);

  if (kind === 'typing') {
    const uid = pickTypingUserId(root);
    const st = pickTypingStatus(root);
    if (uid != null && st != null) return { userId: uid, status: st };

    const nested = root.data;
    if (isRecord(nested)) {
      const inner = getTypingFieldsFromDmEvent(nested);
      if (inner) return inner;
      const uid2 = pickTypingUserId(nested);
      const st2 = pickTypingStatus(nested);
      if (uid2 != null && st2 != null) return { userId: uid2, status: st2 };
    }
  }

  const uidLoose = pickTypingUserId(root);
  const stLoose = pickTypingStatus(root);
  if (
    uidLoose != null &&
    stLoose != null &&
    (root.roomId != null || root.room_id != null || kind === 'typing')
  ) {
    return { userId: uidLoose, status: stLoose };
  }

  return null;
}

function collectTypingEventsFromParsed(parsed: unknown): { userId: number; status: 'start' | 'stop' }[] {
  const out: { userId: number; status: 'start' | 'stop' }[] = [];
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      const root = coerceStompTopicEventRecord(el);
      if (root == null) continue;
      const t = tryTypingFromRoot(root);
      if (t) out.push(t);
    }
    return out;
  }
  const root = coerceStompTopicEventRecord(parsed);
  if (root == null) return out;
  const t = tryTypingFromRoot(root);
  if (t) out.push(t);
  return out;
}

/** STOMP 본문 안의 typing 이벤트를 순서대로 전부 반환(배치 프레임에서 stop 뒤 start 가 있으면 둘 다 반영). */
export function parseAllInboundDmTypingEvents(rawBody: string): {
  userId: number;
  status: 'start' | 'stop';
}[] {
  let parsed: unknown;
  try {
    parsed = parseDmWebSocketJson(rawBody);
  } catch {
    return [];
  }
  return collectTypingEventsFromParsed(parsed);
}

export function parseInboundDmTypingFromTopicBody(rawBody: string): {
  userId: number;
  status: 'start' | 'stop';
} | null {
  const all = parseAllInboundDmTypingEvents(rawBody);
  return all[0] ?? null;
}
