import type { DmMessageResponse } from '../types/dm';
import { dmMessageDedupeKey } from './dmMessageDedupe';

/**
 * 최신 페이지(getMessages 기본)만으로 받은 메시지를 기존 목록에 합친다.
 * 이미 위로 스크롤해 불러온 과거 메시지(id가 이번 배치에 없음)는 그대로 둔다.
 */
export function mergePollSliceIntoMessages(
  prev: DmMessageResponse[],
  incomingChronological: DmMessageResponse[]
): DmMessageResponse[] {
  if (!incomingChronological.length) return prev;

  const incomingIds = new Set(incomingChronological.map((m) => m.id));
  const serverKeys = new Set(incomingChronological.map((m) => dmMessageDedupeKey(m)));

  const kept = prev.filter((m) => m.id < 0 || !incomingIds.has(m.id));
  const stillPending = kept
    .filter((m) => m.id < 0)
    .filter((o) => !serverKeys.has(dmMessageDedupeKey(o)));
  const nonOptimisticKept = kept.filter((m) => m.id >= 0);

  const byId = new Map<number, DmMessageResponse>();
  for (const m of nonOptimisticKept) {
    byId.set(m.id, m);
  }
  for (const m of incomingChronological) {
    byId.set(m.id, m);
  }

  return [...byId.values(), ...stillPending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
