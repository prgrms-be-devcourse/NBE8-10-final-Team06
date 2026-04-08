/**
 * DM 토픽 `/topic/dm.{roomId}` STOMP 본문.
 * - 실시간 **메시지** 수신: `parseBackendDmMessageFromTopicBody` — 백엔드 `WebSocketEventPayload` 만 (`type: "message"`, `data: DmMessageResponse`).
 * - **read**: `parseBackendReadFromTopicBody` — `ReadWsPayload` (`type`, `messageId`).
 * - **typing**: `dmTypingInbound` 등 — `TypingWsPayload` 평면 `{ type, roomId, userId, status }` 및 변형.
 * `parseDmMessagePayload` / `getTypingFieldsFromDmEvent` 등은 직렬화·중첩 폴백용.
 */

import type { IMessage } from '@stomp/stompjs';
import type { DmMessageResponse } from '../types/dm';
import { normalizeDmMessagesFromApi } from './dmMessageDedupe';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** typing 수신용: 숫자·문자열·`{ id }` 등 직렬화 변형에서 양의 user id 만 추출 */
export function coercePositiveUserIdForTyping(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  if (typeof raw === 'object') {
    if (Array.isArray(raw) || raw === null) return null;
    const o = raw as Record<string, unknown>;
    const nested = o.id ?? o.userId ?? o.user_id;
    if (nested != null && nested !== raw) return coercePositiveUserIdForTyping(nested);
    return null;
  }
  const n = Number(typeof raw === 'string' ? raw.trim() : raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * STOMP 본문이 `[{ ... }]` 단일 요소 배열로 올 때 객체로 펼친다.
 * 길이 2+ 배열은 그대로 두어 기존 다건 순회 로직이 처리하게 한다.
 */
export function normalizeStompDmJsonRoot(parsed: unknown): Record<string, unknown> | null {
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) return null;
    const el = parsed[0];
    return isRecord(el) ? el : null;
  }
  return isRecord(parsed) ? parsed : null;
}

/**
 * 토픽 콜백용: typing/read 등 한 건 이벤트를 `Record` 로 만든다.
 * - 평면 객체
 * - 배열이면 **첫 번째** 객체 요소 (브로커가 `[a,b]` 로 묶는 경우에도 typing 이 0번에 오면 처리)
 * `normalizeStompDmJsonRoot` 만 쓰면 길이 2+ 배열에서 null → 조기 return 으로 UI 가 영원히 안 뜨는 문제가 난다.
 */
export function coerceStompTopicEventRecord(parsed: unknown): Record<string, unknown> | null {
  if (parsed == null) return null;
  if (isRecord(parsed)) return parsed;
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      if (isRecord(el)) return el;
    }
  }
  return null;
}

function statusRawToString(stRaw: unknown): string | null {
  if (stRaw == null) return null;
  if (typeof stRaw === 'string') return stRaw;
  if (isRecord(stRaw) && typeof stRaw.name === 'string') return stRaw.name;
  if (typeof stRaw === 'number' || typeof stRaw === 'boolean') return String(stRaw);
  return null;
}

function pickUserIdStatusFromRecord(r: Record<string, unknown>): { userId: number; status: string } | null {
  const uidRaw = r.userId ?? r.user_id ?? r.senderId ?? r.sender_id;
  const stRaw = r.status ?? r.typingStatus ?? r.typing_status;
  const status = statusRawToString(stRaw);
  if (uidRaw == null || status == null) return null;
  const userId = coercePositiveUserIdForTyping(uidRaw);
  if (userId == null) return null;
  return { userId, status };
}

/** STOMP 본문이 JSON 문자열을 한 번 더 감싼 경우 대비 */
export function parseDmWebSocketJson(rawBody: string): unknown {
  const trimmed = rawBody.replace(/^\uFEFF/, '').trim();
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
export function getTypingFieldsFromDmEvent(event: unknown): { userId: number; status: 'start' | 'stop' } | null {
  if (!isRecord(event)) return null;
  const typeLower = resolveDmTopicEventKind(event);

  const normalizeStatus = (s: string): 'start' | 'stop' | null => {
    const sl = s.trim().toLowerCase();
    if (sl === 'start' || sl === 'stop') return sl;
    return null;
  };

  let picked: { userId: number; status: string } | null = null;

  if (typeLower === 'typing') {
    const nested = event.data;
    if (isRecord(nested)) {
      picked = pickUserIdStatusFromRecord(nested);
    }
    if (!picked) picked = pickUserIdStatusFromRecord(event);
  }

  // TypingWsPayload 평면 JSON 에서 type 키가 누락된 경우(roomId·userId·status 만 전달)
  if (!picked) {
    const flat = pickUserIdStatusFromRecord(event);
    if (
      flat &&
      (event.roomId != null || event.room_id != null) &&
      (String(flat.status).toLowerCase() === 'start' || String(flat.status).toLowerCase() === 'stop')
    ) {
      picked = flat;
    }
  }

  // type 필드가 비어 있어도 userId+status+roomId 면 typing 으로 간주 (직렬화·프록시 변형 대비)
  if (!picked && typeLower !== 'read' && typeLower !== 'message' && typeLower !== 'join' && typeLower !== 'leave') {
    const flat = pickUserIdStatusFromRecord(event);
    if (
      flat &&
      (event.roomId != null || event.room_id != null) &&
      (String(flat.status).toLowerCase() === 'start' || String(flat.status).toLowerCase() === 'stop')
    ) {
      picked = flat;
    }
  }

  if (!picked) return null;
  const st = normalizeStatus(picked.status);
  if (st == null) return null;
  return { userId: picked.userId, status: st };
}

/** read 이벤트에서 messageId 추출 (data 래핑 또는 평면) */
export function getReadMessageIdFromDmEvent(event: unknown): number | null {
  if (!isRecord(event) || resolveDmTopicEventKind(event) !== 'read') return null;

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
  if (event.result !== undefined) return event.result;
  if (event.value !== undefined) return event.value;
  return undefined;
}

function envelopeEventKind(event: Record<string, unknown>): string {
  const t =
    event.type ??
    event.eventType ??
    event.event_type ??
    event.kind ??
    event.event;
  return String(t ?? '').toLowerCase();
}

/** STOMP 토픽 JSON 루트에서 이벤트 종류 (typing/read/message 등) — `type` 대체 키 대응 */
export function resolveDmTopicEventKind(parsed: unknown): string {
  if (!isRecord(parsed)) return '';
  return envelopeEventKind(parsed);
}

/** `{ type: "message", data: DmMessageResponse }` 및 변형에서 메시지 추출 */
export function parseWrappedDmMessageEvent(event: unknown): DmMessageResponse | null {
  if (!isRecord(event)) return null;
  if (envelopeEventKind(event) !== 'message') return null;
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
 * 토픽 JSON 루트 후보: 배열·단일 객체 + (선택) RsData 형 `{ resultCode, data: 실제이벤트 }` 한 겹.
 * 게이트웨이/프록시가 REST 와 동일 래퍼를 씌우는 경우 대비.
 */
function flattenDmTopicJsonRoots(parsed: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const push = (r: Record<string, unknown>) => {
    out.push(r);
    const rc = r.resultCode ?? r.result_code;
    const inner = r.data;
    if (
      isRecord(inner) &&
      typeof rc === 'string' &&
      rc.length > 0 &&
      /^\d{3}-/.test(rc.trim())
    ) {
      out.push(inner);
    }
  };
  if (Array.isArray(parsed)) {
    for (const el of parsed) {
      if (isRecord(el)) push(el);
    }
  } else if (isRecord(parsed)) {
    push(parsed);
  }
  return out;
}

/**
 * 백엔드 `DmWebSocketController.message` 브로드캐스트:
 * `WebSocketEventPayload` → `type: "message"` + 본문은 `data`·`payload` 등 (`pickMessagePayloadField`).
 *
 * STOMP/프록시/직렬화에 따라 래퍼 없이 `DmMessageResponse` 만 오거나, `type` 이 이벤트가 아니라
 * 메시지 종류(TEXT 등)만 있는 경우가 있어 폴백을 둔다. 그렇지 않으면 수신 프레임이 버려져
 * 상대 실시간 메시지가 목록에 안 붙는다.
 */
export function parseBackendDmMessageFromTopicBody(rawBody: string): DmMessageResponse | null {
  let parsed: unknown;
  try {
    parsed = parseDmWebSocketJson(rawBody);
  } catch {
    return null;
  }
  if (parsed == null) return null;

  const roots = flattenDmTopicJsonRoots(parsed);

  for (const el of roots) {
    const typ = String(el.type ?? '').toLowerCase();
    if (typ !== 'message') continue;
    const msg = parseWrappedDmMessageEvent(el);
    if (msg && Number.isFinite(msg.id) && msg.id > 0) return msg;
  }

  /** `{ data: DmMessageResponse }` 만 있고 루트 `type: "message"` 가 없는 변형 */
  for (const el of roots) {
    const outerKind = String(el.type ?? '').toLowerCase();
    if (
      outerKind === 'typing' ||
      outerKind === 'read' ||
      outerKind === 'join' ||
      outerKind === 'leave'
    ) {
      continue;
    }
    const inner = el.data;
    if (isRecord(inner)) {
      const msg = parseDmMessagePayload(inner);
      if (msg && Number.isFinite(msg.id) && msg.id > 0) return msg;
    }
  }

  /** 래퍼 없는 평면 `DmMessageResponse` — `type` 이 TEXT/POST… (소문자 text 등) */
  for (const el of roots) {
    const k = String(el.type ?? '').toLowerCase();
    if (k === 'typing' || k === 'read' || k === 'join' || k === 'leave') continue;
    const msg = parseDmMessagePayload(el);
    if (msg && Number.isFinite(msg.id) && msg.id > 0) return msg;
  }

  return null;
}

/**
 * 백엔드 `ReadWsPayload` — `{ "type": "read", "messageId": n }` (Jackson: messageId 필드명).
 */
export function parseBackendReadFromTopicBody(rawBody: string): number | null {
  let parsed: unknown;
  try {
    parsed = parseDmWebSocketJson(rawBody);
  } catch {
    return null;
  }
  if (parsed == null) return null;

  const roots = flattenDmTopicJsonRoots(parsed);

  for (const el of roots) {
    const typ = String(el.type ?? '').toLowerCase();
    if (typ !== 'read') continue;
    const mid = el.messageId ?? el.message_id;
    if (mid != null) {
      const n = Number(mid);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const nested = el.data;
    if (isRecord(nested)) {
      const mid2 = nested.messageId ?? nested.message_id;
      if (mid2 != null) {
        const n2 = Number(mid2);
        if (Number.isFinite(n2) && n2 > 0) return n2;
      }
    }
  }
  return null;
}

/** STOMP 구독 콜백의 본문을 UTF-8 문자열로 통일 */
export function stompMessageBodyToString(message: IMessage): string {
  const b = message.body;
  if (typeof b === 'string' && b.length > 0) return b.replace(/^\uFEFF/, '');
  const bin = message.binaryBody;
  if (bin != null && bin.byteLength > 0) {
    return new TextDecoder('utf-8').decode(bin).replace(/^\uFEFF/, '');
  }
  return typeof b === 'string' ? b.replace(/^\uFEFF/, '') : '';
}

/** @deprecated 백엔드 명세에 맞춘 `parseBackendDmMessageFromTopicBody` 사용 */
export function extractDmMessageFromStompBody(rawBody: string): DmMessageResponse | null {
  return parseBackendDmMessageFromTopicBody(rawBody);
}
