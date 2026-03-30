import type { DmMessageResponse, DmSendMessageRequest, MessageType } from '../types/dm';
import {
  DM_SHARE_BACKUP_SYNTHETIC_ID_CEILING,
  dmMessageDedupeKey,
  dmMessageRelaxedContentKey,
} from './dmMessageDedupe';

/**
 * 세션에 쌓인 STOMP 대기 배치(스토리/공유 등)를 UI 목록에 반영.
 * 이전 구현은 `id < 0` 전부를 지워 일반 채팅 낙관적 메시지까지 증발시킬 수 있음.
 */
export function toOptimisticDmMessagesFromPendingBatch(
  batch: DmSendMessageRequest[],
  sender: number
): DmMessageResponse[] {
  const createdAt = new Date().toISOString();
  return batch.map((pl, i) => ({
    id: -(i + 1),
    type: pl.type as MessageType,
    content: pl.content,
    thumbnail: pl.thumbnail ?? null,
    valid: true,
    createdAt,
    senderId: sender,
  }));
}

export function mergePendingStompBatchIntoUiMessages(
  prev: DmMessageResponse[],
  batch: DmSendMessageRequest[],
  sender: number
): DmMessageResponse[] {
  const batchKeys = new Set(
    batch.map((pl) =>
      dmMessageDedupeKey({
        senderId: sender,
        type: pl.type as DmMessageResponse['type'],
        content: pl.content,
      })
    )
  );
  const kept = prev.filter((m) => m.id >= 0 || !batchKeys.has(dmMessageDedupeKey(m)));
  return [...kept, ...toOptimisticDmMessagesFromPendingBatch(batch, sender)];
}

/** share 백업 합성 id 만 relaxed 로 제거 — `NaN > CEILING` 이 false 라 실서버 행이 걸러지던 버그 방지 */
function isDmShareBackupSyntheticId(m: { id: number }): boolean {
  return Number.isFinite(m.id) && m.id <= DM_SHARE_BACKUP_SYNTHETIC_ID_CEILING;
}

/**
 * 최신 페이지(getMessages 기본)만으로 받은 메시지를 기존 목록에 합친다.
 * 이미 위로 스크롤해 불러온 과거 메시지(id가 이번 배치에 없음)는 그대로 둔다.
 */
function summarizeMergeMessages(label: string, list: DmMessageResponse[]) {
  return {
    label,
    length: list.length,
    ids: list.map((m) => m.id),
    senderIds: list.map((m) => m.senderId),
    keys: list.map((m) => dmMessageDedupeKey(m)),
  };
}

export function mergePollSliceIntoMessages(
  prev: DmMessageResponse[],
  incomingChronological: DmMessageResponse[]
): DmMessageResponse[] {
  if (!incomingChronological.length) return prev;

  /**
   * 이번 배치에만 의존하면 첫 페이지에 없는 과거 서버 글이 빠져 relaxed 키가 비고, share 백업 ghost 가 영구 잔류함.
   * prev 에 남아 있는 양수 id(이미 확정된 서버 메시지) 본문까지 합쳐 동일 텍스트 ghost 를 걷는다.
   */
  const serverAuthority = [
    ...incomingChronological.filter((m) => Number.isFinite(m.id) && m.id > 0),
    ...prev.filter((m) => Number.isFinite(m.id) && m.id > 0),
  ];
  const relaxedFromServer = new Set(serverAuthority.map((m) => dmMessageRelaxedContentKey(m)));

  const incoming = incomingChronological.filter((m) => {
    if (!isDmShareBackupSyntheticId(m)) return true;
    return !relaxedFromServer.has(dmMessageRelaxedContentKey(m));
  });

  if (!incoming.length) return prev;

  const incomingIds = new Set(incoming.map((m) => m.id));
  const serverKeys = new Set(incoming.map((m) => dmMessageDedupeKey(m)));

  const kept = prev.filter((m) => m.id < 0 || !incomingIds.has(m.id));
  const stillPending = kept
    .filter((m) => m.id < 0)
    .filter((o) => !serverKeys.has(dmMessageDedupeKey(o)))
    .filter((o) => {
      if (!isDmShareBackupSyntheticId(o)) return true;
      return !relaxedFromServer.has(dmMessageRelaxedContentKey(o));
    });
  const nonOptimisticKept = kept.filter((m) => m.id >= 0);

  const byId = new Map<number, DmMessageResponse>();
  for (const m of nonOptimisticKept) {
    byId.set(m.id, m);
  }
  for (const m of incoming) {
    byId.set(m.id, m);
  }

  const merged = [...byId.values(), ...stillPending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DM mergePollSlice]', {
      prev: summarizeMergeMessages('prev', prev),
      incoming: summarizeMergeMessages('incoming', incoming),
      merged: summarizeMergeMessages('merged', merged),
    });
  }

  return merged;
}

/**
 * STOMP `/topic/dm.{roomId}` 의 `message` 이벤트 한 건을 목록에 반영.
 * 백엔드는 `WebSocketEventPayload` 로 `{ type: "message", data: DmMessageResponse }` 만 브로드캐스트한다.
 */
export function mergeRealtimeDmMessageIntoList(
  prev: DmMessageResponse[],
  incoming: DmMessageResponse
): { next: DmMessageResponse[]; isNewServerMessage: boolean } {
  if (!Number.isFinite(incoming.id) || incoming.id <= 0) {
    return { next: prev, isNewServerMessage: false };
  }
  if (prev.some((m) => m.id === incoming.id)) {
    return { next: prev, isNewServerMessage: false };
  }
  const fp = dmMessageDedupeKey(incoming);
  const withoutMatchingTemp = prev.filter(
    (m) => m.id >= 0 || dmMessageDedupeKey(m) !== fp
  );
  const next = [...withoutMatchingTemp, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return { next, isNewServerMessage: true };
}
