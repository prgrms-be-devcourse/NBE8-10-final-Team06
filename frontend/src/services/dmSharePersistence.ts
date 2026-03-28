import type { DmMessageResponse, DmSendMessageRequest } from '../types/dm';
import { dmMessageDedupeKey } from '../util/dmMessageDedupe';

const LS_KEY = 'devstagram-dm-share-backup';

type StoredEntry = {
  senderId: number;
  type: string;
  content: string;
  thumbnail: string | null;
  ts: number;
};

type StoreShape = Record<string, StoredEntry[]>;

const MAX_PER_ROOM = 80;

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(obj: StoreShape): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {
    /* quota / private mode */
  }
}

/** STOMP 전송 직후 호출 — 재입장 시 서버 목록에 없으면 카드 복원 */
export function persistShareBackup(roomId: number, senderId: number, payloads: DmSendMessageRequest[]): void {
  if (!roomId || !payloads.length) return;
  const obj = readStore();
  const k = String(roomId);
  const now = Date.now();
  const incoming: StoredEntry[] = payloads.map((pl) => ({
    senderId,
    type: pl.type,
    content: pl.content,
    thumbnail: pl.thumbnail ?? null,
    ts: now,
  }));
  const existing = obj[k] ?? [];
  const seen = new Set(
    existing.map((e) => dmMessageDedupeKey({ senderId: e.senderId, type: e.type as DmMessageResponse['type'], content: e.content }))
  );
  const merged = [...existing];
  for (const e of incoming) {
    const key = dmMessageDedupeKey({ senderId: e.senderId, type: e.type as DmMessageResponse['type'], content: e.content });
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  obj[k] = merged.slice(-MAX_PER_ROOM);
  writeStore(obj);
}

/** 서버에 동일 메시지가 보이면 백업에서 제거(중복 카드 방지) */
export function pruneShareBackupByServer(roomId: number, serverMessages: DmMessageResponse[]): void {
  if (!roomId || !serverMessages.length) return;
  const obj = readStore();
  const k = String(roomId);
  const list = obj[k];
  if (!list?.length) return;
  const serverKeys = new Set(serverMessages.map((m) => dmMessageDedupeKey(m)));
  const next = list.filter(
    (e) => !serverKeys.has(dmMessageDedupeKey({ senderId: e.senderId, type: e.type as DmMessageResponse['type'], content: e.content }))
  );
  if (next.length === 0) delete obj[k];
  else obj[k] = next;
  writeStore(obj);
}

export function mergeServerWithShareBackup(roomId: number, serverChronological: DmMessageResponse[]): DmMessageResponse[] {
  const obj = readStore();
  const list = obj[String(roomId)];
  if (!list?.length) return serverChronological;
  const serverKeys = new Set(serverChronological.map((m) => dmMessageDedupeKey(m)));
  const extra: DmMessageResponse[] = [];
  list.forEach((e, i) => {
    const row: DmMessageResponse = {
      id: -10_000_000_000 - e.ts - i,
      type: e.type as DmMessageResponse['type'],
      content: e.content,
      thumbnail: e.thumbnail,
      valid: true,
      createdAt: new Date(e.ts).toISOString(),
      senderId: e.senderId,
    };
    if (!serverKeys.has(dmMessageDedupeKey(row))) {
      extra.push(row);
      serverKeys.add(dmMessageDedupeKey(row));
    }
  });
  if (extra.length === 0) return serverChronological;
  return [...serverChronological, ...extra].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
