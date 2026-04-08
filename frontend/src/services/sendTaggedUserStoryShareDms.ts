import { dmApi } from '../api/dm';
import { buildStorySharePayload } from '../util/dmDeepLinks';
import { useDmStore } from '../store/useDmStore';
import { publishDmBatchesOneShot, type DmBatchToPublish } from './dmOneShotStompSend';

function isDmApiSuccess(resultCode: string | undefined): boolean {
  return !!resultCode && (resultCode.startsWith('200') || resultCode.includes('-S-'));
}

/**
 * 스토리 작성 후 태그된 유저마다 1:1 방을 맞춘 뒤, 스토리 링크(STORY 타입) DM을 STOMP 로 전송한다.
 * 백엔드 태그 알림 DM 과 별도로 동작하며, 실패해도 예외를 밖으로 던지지 않는다(스토리 공유 흐름만 베스트 에포트).
 */
export async function sendTaggedUserStoryShareDms(options: {
  taggedUserIds: number[];
  storyId: number;
  authorUserId: number;
  createdAtIso: string;
}): Promise<void> {
  const { taggedUserIds, storyId, authorUserId, createdAtIso } = options;
  const uniqueTargets = [...new Set(taggedUserIds.map(Number))].filter(
    (id) => Number.isFinite(id) && id > 0 && id !== authorUserId
  );
  if (uniqueTargets.length === 0) return;

  const sharePayload = buildStorySharePayload(storyId, createdAtIso, authorUserId);
  const batches: DmBatchToPublish[] = [];

  for (const otherUserId of uniqueTargets) {
    try {
      const res = await dmApi.create1v1Room(otherUserId);
      if (isDmApiSuccess(res.resultCode)) {
        useDmStore.getState().setRooms(res.data.rooms);
        batches.push({ roomId: res.data.roomId, payloads: [sharePayload] });
      }
    } catch {
      /* 방 생성 실패 시 해당 유저만 건너뜀 */
    }
  }

  if (batches.length === 0) return;

  try {
    await publishDmBatchesOneShot(batches);
  } catch {
    /* STOMP 실패 — 스토리는 이미 생성됨 */
  }
}
