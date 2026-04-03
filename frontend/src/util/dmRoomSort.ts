import type { DmRoomSummaryResponse } from '../types/dm';

function parseIsoMs(iso: string | undefined | null): number | null {
  if (iso == null || iso === '') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** 최근 메시지 시각(없으면 참여 시각) — 목록 정렬용 */
export function dmRoomRecencyMs(room: DmRoomSummaryResponse): number {
  const last = parseIsoMs(room.lastMessage?.createdAt);
  if (last != null) return last;
  const joined = parseIsoMs(room.joinedAt);
  return joined ?? 0;
}

/** 최신 활동(마지막 메시지)이 위로 오도록 내림차순 정렬 */
export function sortDmRoomsByRecentMessage(rooms: DmRoomSummaryResponse[]): DmRoomSummaryResponse[] {
  return [...rooms].sort((a, b) => dmRoomRecencyMs(b) - dmRoomRecencyMs(a));
}
