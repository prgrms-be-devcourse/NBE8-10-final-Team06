import type { DmMessageResponse } from '../types/dm';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * JWT·스토어·REST·STOMP 등 어디서 온 값이든 양의 유한 숫자 user id 만 통과.
 * NaN, 0, 객체, 빈 문자열, boolean 은 null.
 */
export function toDmPositiveUserId(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'object') return null;
  if (typeof v === 'boolean') return null;
  const raw = typeof v === 'string' ? v.trim() : v;
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** STOMP/read 등에서 본인 id 가 확정됐는지 (null·NaN 제외) */
export function isResolvedDmUserId(v: number | null | undefined): v is number {
  return toDmPositiveUserId(v) !== null;
}

/**
 * REST/WS 직렬화 차이: senderId 숫자·문자열, sender_id, 중첩 sender.{id|userId} 등.
 * Number(객체) → NaN 이 되어 말풍선 isMe 가 전부 틀어지는 경우를 막는다.
 */
export function pickDmSenderIdFromRow(r: Record<string, unknown>): number {
  const tryScalar = (v: unknown): number | null => toDmPositiveUserId(v);

  /**
   * 루트 `userId` 는 수신자·세션 주체로 올 수 있어 마지막에만 본다.
   * `{ userId: 나, sender: { id: 상대 } }` 를 잘못 읽으면 상대 메시지가 전부 내 말풍선·dedupe 에서 사라질 수 있다.
   */
  const explicitSenderScalars: unknown[] = [
    r.senderId,
    r.sender_id,
    r.senderUserId,
    r.sender_user_id,
    r.fromUserId,
    r.from_user_id,
    r.writerId,
    r.writer_id,
    r.authorId,
    r.author_id,
    r.sendUserId,
    r.send_user_id,
  ];
  for (const s of explicitSenderScalars) {
    const n = tryScalar(s);
    if (n != null) return n;
  }

  const sender = r.sender;
  if (isRecord(sender)) {
    for (const k of [sender.id, sender.userId, sender.user_id] as unknown[]) {
      const n = tryScalar(k);
      if (n != null) return n;
    }
  }

  const genericUserScalars: unknown[] = [
    r.userId,
    r.user_id,
    r.memberId,
    r.member_id,
    r.ownerId,
    r.owner_id,
  ];
  for (const s of genericUserScalars) {
    const n = tryScalar(s);
    if (n != null) return n;
  }

  const last = tryScalar(r.sender);
  return last ?? 0;
}

export function dmMessageDedupeKey(m: Pick<DmMessageResponse, 'senderId' | 'type' | 'content'>): string {
  return `${Number(m.senderId)}|${m.type}|${m.content}`;
}

/** mergeServerWithShareBackup 이 만드는 합성 id 상한(이보다 작거나 같으면 로컬 백업 행) — handleSend 낙관적 -1,-2 와 구분 */
export const DM_SHARE_BACKUP_SYNTHETIC_ID_CEILING = -10_000_000_000;

/** strict dedupe 가 발신자만 어긋날 때(서버 2|TEXT|x vs 백업 1|TEXT|x) 동일 본문 여부 판별용 */
export function dmMessageRelaxedContentKey(m: Pick<DmMessageResponse, 'type' | 'content'>): string {
  return `${m.type}|${String(m.content ?? '').trim()}`;
}

/** 말풍선 좌우: 본인 id 와 발신자 id 비교 (문자·실수·0·NaN 안전) */
export function isDmMessageFromUser(
  msg: Pick<DmMessageResponse, 'senderId'>,
  userId: number | null | undefined
): boolean {
  const self = toDmPositiveUserId(userId);
  const sid = toDmPositiveUserId(msg.senderId);
  return self != null && sid != null && sid === self;
}

const SENDER_ENVELOPE_KEYS = [
  'senderId',
  'sender_id',
  'userId',
  'user_id',
  'sender',
  'fromUserId',
  'from_user_id',
] as const;

/** 상위 객체에만 발신자 필드가 있고 본문은 `data` 안에 있을 때 병합용 */
function pickSenderFieldsFromEnvelope(r: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of SENDER_ENVELOPE_KEYS) {
    if (r[k] != null) o[k] = r[k];
  }
  return o;
}

/** 래퍼 병합 시 바깥 스칼라가 안쪽 발신자를 덮어쓰면 안 되는 키(브로커/컨트롤러가 수신자 userId 를 루트에 두는 경우 등) */
const ENVELOPE_KEYS_THAT_OVERWRITE_SENDER = [
  'senderId',
  'sender_id',
  'userId',
  'user_id',
  'sender',
  'fromUserId',
  'from_user_id',
] as const;

function dmNestedBodyHasSenderIdentity(body: Record<string, unknown>): boolean {
  if (toDmPositiveUserId(body.senderId) != null) return true;
  if (toDmPositiveUserId(body.sender_id) != null) return true;
  const s = body.sender;
  if (isRecord(s)) {
    if (toDmPositiveUserId(s.id) != null) return true;
    if (toDmPositiveUserId(s.userId) != null) return true;
    if (toDmPositiveUserId(s.user_id) != null) return true;
  }
  return false;
}

/**
 * STOMP/WebSocketEventPayload 등 `{ type, userId, data: DmMessageResponse }` 평탄화 시,
 * `data` 안에 이미 발신자 필드가 있으면 루트의 `userId`/`senderId` 가 이를 덮어쓰지 않게 한다.
 * (런타임 로그: REST 는 senderId 1·2 교대로 정상인데 WS 꼬리만 전부 senderId 1 → 전부 내 말풍선)
 */
function mergeDmMessageNestedWithEnvelope(
  nested: Record<string, unknown>,
  envelope: Record<string, unknown>
): Record<string, unknown> {
  const picked = { ...pickSenderFieldsFromEnvelope(envelope) };
  if (dmNestedBodyHasSenderIdentity(nested)) {
    for (const k of ENVELOPE_KEYS_THAT_OVERWRITE_SENDER) {
      delete picked[k];
    }
  }
  return { ...nested, ...picked };
}

function dmRowHasEffectiveThumbnail(row: Record<string, unknown>): boolean {
  for (const k of ['thumbnail', 'thumbnailUrl', 'thumbnail_url'] as const) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return true;
  }
  return false;
}

/** 래퍼 루트에만 썸네일이 있을 때 `data` 병합 후 유실 방지 */
function applyDmEnvelopeThumbnailFallback(
  merged: Record<string, unknown>,
  envelope: Record<string, unknown>
): Record<string, unknown> {
  if (dmRowHasEffectiveThumbnail(merged)) return merged;
  const fb =
    envelope.thumbnail ?? envelope.thumbnailUrl ?? envelope.thumbnail_url;
  if (typeof fb === 'string' && fb.trim() !== '') {
    return { ...merged, thumbnail: fb.trim() };
  }
  return merged;
}

/**
 * REST/STOMP 한 겹 래핑 `{ data: { id, content, ... } }` + 바깥에 senderId 만 있는 형태 평탄화.
 */
function coerceDmMessageRowForNormalize(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};
  const r = raw;
  const hasTopMessageId =
    r.id != null || r.messageId != null || r.message_id != null;
  const nested = r.data;
  if (
    !hasTopMessageId &&
    isRecord(nested) &&
    (nested.id != null || nested.messageId != null || nested.message_id != null)
  ) {
    return applyDmEnvelopeThumbnailFallback(mergeDmMessageNestedWithEnvelope(nested, r), r);
  }
  // 일부 직렬화에서 `data` 가 객체가 아니라 JSON 문자열로 옴 → id 없는 래퍼만 남아 메시지가 통째로 드롭되던 문제
  if (!hasTopMessageId && typeof nested === 'string') {
    const t = nested.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const inner = JSON.parse(t) as unknown;
        if (
          isRecord(inner) &&
          (inner.id != null || inner.messageId != null || inner.message_id != null)
        ) {
          return applyDmEnvelopeThumbnailFallback(mergeDmMessageNestedWithEnvelope(inner, r), r);
        }
      } catch {
        /* ignore */
      }
    }
  }
  // `{ data: { data: DmMessageResponse } }` (공통 래퍼 중첩)
  if (
    !hasTopMessageId &&
    isRecord(nested) &&
    nested.id == null &&
    nested.messageId == null &&
    nested.message_id == null
  ) {
    const inner = nested.data;
    if (
      isRecord(inner) &&
      (inner.id != null || inner.messageId != null || inner.message_id != null)
    ) {
      const mid = mergeDmMessageNestedWithEnvelope(
        mergeDmMessageNestedWithEnvelope(inner, r),
        nested
      );
      return applyDmEnvelopeThumbnailFallback(applyDmEnvelopeThumbnailFallback(mid, nested), r);
    }
  }
  return r;
}

/**
 * 말풍선 isMe (본인 = 오른쪽·파랑).
 * - 그룹: `senderId === 본인` 일 때만 true.
 * - 1:1: **상대 userId 가 알려지면** `senderId === 상대` 이면 무조건 false — 본인 id 추정이 잠깐 틀려도 상대 메시지가 파란 말풍선으로 가지 않게.
 * - 그다음 본인 id 확정 시 `senderId === 본인`.
 * - 본인 id 미확정·1:1: 상대·발신자 id 둘 다 유효할 때만 `senderId !== 상대` 로 추정.
 */
export function computeDmMessageIsMe(
  msg: Pick<DmMessageResponse, 'senderId'>,
  myUserIdNum: number | null | undefined,
  ctx?: { isGroup?: boolean; opponentUserId?: number | null | undefined }
): boolean {
  const self = toDmPositiveUserId(myUserIdNum);
  const sid = toDmPositiveUserId(msg.senderId);
  const opp = toDmPositiveUserId(ctx?.opponentUserId);

  let out: boolean;
  if (ctx?.isGroup === true) {
    out = self != null && sid != null && sid === self;
  } else if (opp != null && sid != null && sid === opp) {
    out = false;
  } else if (self != null) {
    out = sid != null && sid === self;
  } else if (opp == null || sid == null) {
    out = false;
  } else {
    out = sid !== opp;
  }

  return out;
}

/**
 * 타이핑 이벤트의 `userId` 는 메시지 `senderId` 와 같은 축.
 * 말풍선 출력 직전에 메시지와 동일한 `computeDmMessageIsMe` 규칙으로 본인 여부만 판별.
 */
export function isDmTypingBubbleMine(
  typingUserId: number | null | undefined,
  myUserIdNum: number | null | undefined,
  ctx?: { isGroup?: boolean; opponentUserId?: number | null | undefined }
): boolean {
  const sid: number = typingUserId == null ? NaN : typingUserId;
  return computeDmMessageIsMe({ senderId: sid }, myUserIdNum, ctx);
}

/**
 * @deprecated `computeDmMessageIsMe` 와 동일 로직(호환 별칭).
 */
export function isDmMessageLikelyMine(
  msg: Pick<DmMessageResponse, 'senderId'>,
  selfId: number | null | undefined,
  ctx?: { isGroup?: boolean; opponentUserId?: number | null | undefined }
): boolean {
  return computeDmMessageIsMe(msg, selfId, ctx);
}

/** Jackson LocalDateTime 배열 등 → ISO 문자열 */
function normalizeCreatedAtFromApi(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length >= 3) {
    const y = Number(v[0]);
    const mo = Number(v[1]);
    const d = Number(v[2]);
    const h = v.length > 3 ? Number(v[3]) : 0;
    const mi = v.length > 4 ? Number(v[4]) : 0;
    const s = v.length > 5 ? Number(v[5]) : 0;
    if (![y, mo, d].every((n) => Number.isFinite(n))) return '';
    const dt = new Date(y, mo - 1, d, h, mi, s);
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
  }
  return String(v);
}

/** Jackson 이 enum 을 `{ "name": "TEXT" }` 로보내는 환경 대비 */
function coerceDmMessageTypeFromApi(raw: unknown): DmMessageResponse['type'] {
  if (raw == null || raw === '') return 'TEXT';
  if (typeof raw === 'string') return raw as DmMessageResponse['type'];
  if (isRecord(raw) && typeof raw.name === 'string') {
    return raw.name as DmMessageResponse['type'];
  }
  return String(raw) as DmMessageResponse['type'];
}

/** GET 메시지 응답 필드가 조금 달라도 카드/키 일치용으로 맞춤 */
export function normalizeDmMessagesFromApi(rows: unknown[] | undefined): DmMessageResponse[] {
  if (!rows?.length) return [];
  const out: DmMessageResponse[] = [];
  for (const row of rows) {
    const r = coerceDmMessageRowForNormalize(row);
    const rawId = r?.id ?? r?.messageId ?? r?.message_id;
    if (rawId == null || rawId === '') continue;
    const idNum = Number(rawId);
    if (!Number.isFinite(idNum) || idNum <= 0) continue;
    const thumbRaw =
      r.thumbnail ??
      r.thumbnailUrl ??
      r.thumbnail_url ??
      r.imageUrl ??
      r.image_url ??
      r.thumbUrl ??
      r.thumb_url;
    const thumbStr =
      typeof thumbRaw === 'string' && thumbRaw.trim() !== '' ? thumbRaw.trim() : null;

    const msgType = coerceDmMessageTypeFromApi(r.type);
    const contentStr = String(r.content ?? '');
    const normalizedValid = r.valid !== false;

    out.push({
      id: idNum,
      type: msgType,
      content: contentStr,
      thumbnail: thumbStr,
      valid: normalizedValid,
      createdAt: normalizeCreatedAtFromApi(r.createdAt ?? r.created_at),
      senderId: pickDmSenderIdFromRow(r),
    });
  }
  return out;
}
