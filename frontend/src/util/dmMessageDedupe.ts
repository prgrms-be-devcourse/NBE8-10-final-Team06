import type { DmMessageResponse } from '../types/dm';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * REST/WS 직렬화 차이: senderId 숫자·문자열, sender_id, 중첩 sender.{id|userId} 등.
 * Number(객체) → NaN 이 되어 말풍선 isMe 가 전부 틀어지는 경우를 막는다.
 */
export function pickDmSenderIdFromRow(r: Record<string, unknown>): number {
  const tryScalar = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'object') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const scalars: unknown[] = [
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
  for (const s of scalars) {
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

  const last = tryScalar(r.sender);
  return last ?? 0;
}

export function dmMessageDedupeKey(m: Pick<DmMessageResponse, 'senderId' | 'type' | 'content'>): string {
  return `${Number(m.senderId)}|${m.type}|${m.content}`;
}

/** 말풍선 좌우: 본인 id 와 발신자 id 비교 (문자·실수·0·NaN 안전) */
export function isDmMessageFromUser(msg: Pick<DmMessageResponse, 'senderId'>, userId: number): boolean {
  const self = Number(userId);
  if (!Number.isFinite(self) || self <= 0) return false;
  const sid = Number(msg.senderId);
  return Number.isFinite(sid) && sid > 0 && sid === self;
}

/**
 * 실시간/초기 로드 시 본인 id 가 아직 없거나 틀릴 때: 1:1 이면 상대 userId 와 senderId 가 다르면 내 메시지로 간주.
 * 그룹방·상대 미확정 시에는 추정하지 않는다.
 */
export function isDmMessageLikelyMine(
  msg: Pick<DmMessageResponse, 'senderId'>,
  selfId: number,
  ctx?: { isGroup?: boolean; opponentUserId?: number | null | undefined }
): boolean {
  if (isDmMessageFromUser(msg, selfId)) return true;

  const selfOk = Number.isFinite(selfId) && selfId > 0;
  if (selfOk) return false;

  if (ctx?.isGroup) return false;

  const opp = ctx?.opponentUserId != null ? Number(ctx.opponentUserId) : Number.NaN;
  if (!Number.isFinite(opp) || opp <= 0) return false;

  const sid = Number(msg.senderId);
  if (!Number.isFinite(sid) || sid <= 0) return false;

  return sid !== opp;
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

/** GET 메시지 응답 필드가 조금 달라도 카드/키 일치용으로 맞춤 */
export function normalizeDmMessagesFromApi(rows: unknown[] | undefined): DmMessageResponse[] {
  if (!rows?.length) return [];
  const out: DmMessageResponse[] = [];
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const rawId = r?.id ?? r?.messageId;
    if (rawId == null || rawId === '') continue;
    out.push({
      id: Number(rawId),
      type: r.type as DmMessageResponse['type'],
      content: String(r.content ?? ''),
      thumbnail: (r.thumbnail as string | null | undefined) ?? null,
      valid: r.valid !== false,
      createdAt: normalizeCreatedAtFromApi(r.createdAt),
      senderId: pickDmSenderIdFromRow(r),
    });
  }
  return out;
}
