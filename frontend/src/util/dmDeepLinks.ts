import type { DmSendMessageRequest } from '../types/dm';

/** DM 본문에 넣는 첨부 URI — DmChatPage MessageItem 파서와 동일 규칙 */

export function buildPostShareMessage(postId: number): string {
  return `devstagram://post?id=${postId}`;
}

/**
 * 스토리 만료 UI(24h)용 v 파라미터 — 초 단위 타임스탬프
 */
/**
 * @param authorUserId DM에서 시청 API 실패 시 `/story/:userId` 폴백용(선택)
 */
export function buildStoryShareMessage(storyId: number, createdAtIso: string, authorUserId?: number): string {
  const ms = Date.parse(createdAtIso);
  const vSec = Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
  let uri = `devstagram://story?id=${storyId}&v=${vSec}`;
  if (authorUserId != null && Number.isFinite(authorUserId)) {
    uri += `&u=${authorUserId}`;
  }
  return uri;
}

/** STOMP 전송용 — 서버가 POST 타입일 때 썸네일·존재 여부(valid)를 반영 */
export function buildPostSharePayload(postId: number): DmSendMessageRequest {
  return { type: 'POST', content: buildPostShareMessage(postId), thumbnail: null };
}

/** STOMP 전송용 — 서버가 STORY 타입일 때 만료(valid)를 판단 */
export function buildStorySharePayload(storyId: number, createdAtIso: string, authorUserId?: number): DmSendMessageRequest {
  return { type: 'STORY', content: buildStoryShareMessage(storyId, createdAtIso, authorUserId), thumbnail: null };
}
