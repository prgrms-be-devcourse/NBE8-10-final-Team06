/**
 * DM 토픽 `/topic/dm.{roomId}` STOMP 본문 정규화.
 * - `message`: 서버가 `WebSocketEventPayload` 형태 `{ type, data }` 로 전송.
 * - `typing` / `read`: 서버가 평면 `{ type, userId?, status?, messageId?, ... }` 로 전송.
 * 두 형태를 모두 수용해 기존·향후 응답에 영향 없이 동일 UI 로직을 쓴다.
 */

import type { IMessage } from '@stomp/stompjs';
import type { DmMessageResponse } from '../types/dm';
import { normalizeDmMessagesFromApi } from './dmMessageDedupe';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickUserIdStatusFromRecord(r: Record<string, unknown>): { userId: number; status: string } | null {
  const uidRaw = r.userId ?? r.user_id ?? r.senderId ?? r.sender_id;
  const stRaw = r.status;
  if (uidRaw == null || stRaw == null) return null;
  const userId = Number(uidRaw);
  const status = String(stRaw);
  if (!Number.isFinite(userId) || !status) return null;
  return { userId, status };
}

/** STOMP 본문이 JSON 문자열을 한 번 더 감싼 경우 대비 */
export function parseDmWebSocketJson(rawBody: string): unknown {
  const trimmed = rawBody.trim();
  if (!trimmed) return null;
  let v: unknown = JSON.parse(trimmed);
  if (typeof v === 'string') {
    const inner = v.trim();
    if (
      (inner.startsWith('{') && inner.endsWith('}')) ||
      (inner.startsWith('[') && inner.endsWith(']'))
    ) {
      try {
        v = JSON.parse(inner);
      } catch {
        /* 한 겹만 */
      }
    }
  }
  return v;
}

/** typing 이벤트에서 userId·status 추출 (data 래핑 또는 평면, type 대소문자·스네이크 키 허용) */
export function getTypingFieldsFromDmEvent(event: unknown): { userId: number; status: string } | null {
  if (!isRecord(event)) return null;
  const typeLower = String(event.type ?? '').toLowerCase();

  if (typeLower === 'typing') {
    const nested = event.data;
    if (isRecord(nested)) {
      const fromNested = pickUserIdStatusFromRecord(nested);
      if (fromNested) return fromNested;
    }
    return pickUserIdStatusFromRecord(event);
  }

  // TypingWsPayload 평면 JSON 에서 type 키가 누락된 경우(roomId·userId·status 만 전달)
  const flat = pickUserIdStatusFromRecord(event);
  if (
    flat &&
    (event.roomId != null || event.room_id != null) &&
    (String(flat.status).toLowerCase() === 'start' || String(flat.status).toLowerCase() === 'stop')
  ) {
    return flat;
  }

  return null;
}

/** read 이벤트에서 messageId 추출 (data 래핑 또는 평면) */
export function getReadMessageIdFromDmEvent(event: unknown): number | null {
  if (!isRecord(event) || String(event.type ?? '').toLowerCase() !== 'read') return null;

  const nested = event.data;
  if (isRecord(nested)) {
    const mid = nested.messageId ?? nested.message_id;
    if (mid != null) {
      const n = Number(mid);
      return Number.isFinite(n) ? n : null;
    }
  }

  const top = event.messageId ?? event.message_id;
  if (top != null) {
    const n = Number(top);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

/**
 * WS `message` 이벤트의 `data` 필드만으로 DmMessageResponse 복원.
 * - 객체 / 이중 인코딩 문자열 / 일부 브로커 직렬화 형태 대응
 */
export function parseDmMessagePayload(data: unknown, depth = 0): DmMessageResponse | null {
  if (depth > 4) return null;
  let row: Record<string, unknown> | null = null;
  if (typeof data === 'string') {
    const t = data.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      return parseDmMessagePayload(p, depth + 1);
    } catch {
      return null;
    }
  } else if (isRecord(data)) {
    row = data;
  }
  if (!row) return null;
  const normalized = normalizeDmMessagesFromApi([row]);
  return normalized[0] ?? null;
}

/** 래퍼에서 메시지 본문 필드 후보 (브로커·직렬화 차이) */
function pickMessagePayloadField(event: Record<string, unknown>): unknown {
  if (event.data !== undefined) return event.data;
  if (event.payload !== undefined) return event.payload;
  if (event.message !== undefined) return event.message;
  if (event.body !== undefined) return event.body;
  return undefined;
}

/** `{ type: "message", data: DmMessageResponse }` 및 변형에서 메시지 추출 */
export function parseWrappedDmMessageEvent(event: unknown): DmMessageResponse | null {
  if (!isRecord(event)) return null;
  if (String(event.type ?? '').toLowerCase() !== 'message') return null;
  const data = pickMessagePayloadField(event);
  const msg = parseDmMessagePayload(data);
  if (msg) return msg;
  if ((data === undefined || data === null) && event.id != null) {
    const row = normalizeDmMessagesFromApi([event]);
    if (row[0] && Number(row[0].id) > 0) return row[0];
  }
  return null;
}

/**
 * STOMP `/topic/dm.*` 본문에서 수신 메시지 한 건 추출 (래퍼·평면·이중 JSON).
 * 실시간 말풍선이 안 붙는 경우 대부분 파싱 실패이므로 후보를 넓힌다.
 */
export function parseAnyInboundDmStompBody(rawBody: string): DmMessageResponse | null {
  let parsed: unknown;
  try {
    parsed = parseDmWebSocketJson(rawBody);
  } catch {
    return null;
  }
  if (parsed == null) return null;

  const wrapped = parseWrappedDmMessageEvent(parsed);
  if (wrapped) return wrapped;

  if (isRecord(parsed)) {
    const typ = String(parsed.type ?? '').toLowerCase();
    if (typ === 'typing' || typ === 'read' || typ === 'join' || typ === 'leave' || typ === 'message') return null;
    const row = normalizeDmMessagesFromApi([parsed]);
    const m = row[0];
    if (m && Number.isFinite(m.id) && m.id > 0 && Number(m.senderId) > 0) {
      return m;
    }
  }
  return null;
}

/** STOMP 구독 콜백의 본문을 UTF-8 문자열로 통일 */
export function stompMessageBodyToString(message: IMessage): string {
  const b = message.body;
  if (typeof b === 'string' && b.length > 0) return b;
  const bin = message.binaryBody;
  if (bin != null && bin.byteLength > 0) {
    return new TextDecoder('utf-8').decode(bin);
  }
  return typeof b === 'string' ? b : '';
}

/** STOMP `message` 프레임 본문(JSON)에서 `DmMessageResponse` 추출 (data 중첩·문자열 JSON 대응) */
export function extractDmMessageFromStompBody(rawBody: string): DmMessageResponse | null {
  return parseAnyInboundDmStompBody(rawBody);
}
