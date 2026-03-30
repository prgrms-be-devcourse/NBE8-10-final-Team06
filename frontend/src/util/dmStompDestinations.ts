/**
 * DM STOMP destination 규약 — 백엔드 `WebSocketConfig` + `DmWebSocketController` 와 동일해야 함.
 * 서버는 CONNECT 시 JWT로 Principal 을 심고, 이후 SEND 에서 SecurityContext 를 복원해 `/app/dm/.../message`·`read` 가 동작한다.
 */

import type { DmSendMessageRequest } from '../types/dm';

/** `/app/dm/{roomId}/message` 본문 — 백엔드 `DmSendMessageRequest` record 와 필드 일치 */
export function buildDmStompMessageBody(pl: DmSendMessageRequest): DmSendMessageRequest {
  return {
    type: pl.type,
    content: pl.content,
    thumbnail: pl.thumbnail ?? null,
  };
}

export function dmStompTopic(roomId: number): string {
  return `/topic/dm.${roomId}`;
}

export function dmStompAppMessage(roomId: number): string {
  return `/app/dm/${roomId}/message`;
}

export function dmStompAppTyping(roomId: number): string {
  return `/app/dm/${roomId}/typing`;
}

export function dmStompAppRead(roomId: number): string {
  return `/app/dm/${roomId}/read`;
}

export function dmStompAppJoin(roomId: number): string {
  return `/app/dm/${roomId}/join`;
}

export function dmStompAppLeave(roomId: number): string {
  return `/app/dm/${roomId}/leave`;
}
