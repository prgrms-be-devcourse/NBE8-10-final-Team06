import type { DmMessageResponse } from '../types/dm';

export function dmMessageDedupeKey(m: Pick<DmMessageResponse, 'senderId' | 'type' | 'content'>): string {
  return `${Number(m.senderId)}|${m.type}|${m.content}`;
}

/** GET 메시지 응답 필드가 조금 달라도 카드/키 일치용으로 맞춤 */
export function normalizeDmMessagesFromApi(rows: unknown[] | undefined): DmMessageResponse[] {
  if (!rows?.length) return [];
  const out: DmMessageResponse[] = [];
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    if (r?.id == null) continue;
    out.push({
      id: Number(r.id),
      type: r.type as DmMessageResponse['type'],
      content: String(r.content ?? ''),
      thumbnail: (r.thumbnail as string | null | undefined) ?? null,
      valid: r.valid !== false,
      createdAt: String(r.createdAt ?? ''),
      senderId: Number(r.senderId ?? r.sender_id ?? 0),
    });
  }
  return out;
}
