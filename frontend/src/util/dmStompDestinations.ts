/**
 * DM STOMP destination 규약 — 백엔드 `WebSocketConfig` + `DmWebSocketController` 와 동일.
 * 송신 본문: `message` → `DmSendMessageRequest`(type, content, thumbnail), `read`/`typing`/`join`/`leave` → 컨트롤러 DTO.
 *
 * 참고: 일반 Spring+React 예제(예: github.com/JadhavC07/Spring-boot-react-chat-web-app)는
 * `/app/message`, `/topic/...` 등 다른 목적지를 쓰므로 그대로 복사하면 안 된다.
 * 이 프로젝트는 반드시 `/app/dm/{roomId}/...` 와 `/topic/dm.{roomId}` 만 사용한다.
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
