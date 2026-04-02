import type { DmSendMessageRequest } from '../types/dm';

const STORAGE_KEY = 'devstagram-dm-pending-payloads';

type PendingBatch = { roomId: number; payloads: DmSendMessageRequest[] };

export function setPendingDmBatch(roomId: number, payloads: DmSendMessageRequest[]): void {
  if (!payloads.length) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId, payloads } satisfies PendingBatch));
}

/** roomId가 일치할 때만 읽고 저장소에서 제거 */
export function takePendingDmBatch(expectedRoomId: number): DmSendMessageRequest[] | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const batch = JSON.parse(raw) as PendingBatch;
    if (batch.roomId !== expectedRoomId || !Array.isArray(batch.payloads)) {
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return batch.payloads;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
