import type { DmMessageResponse } from '../types/dm';

/** REST/WS 공통 — 본문 형식이 조금 달라도 게시물·스토리 카드로 인식 */
export function resolveDmAttachment(msg: DmMessageResponse): { type: 'post' | 'story'; id: string } | null {
  const c = msg.content ?? '';
  const direct = c.match(/devstagram:\/\/(post|story)\?id=(\d+)/i);
  if (direct) return { type: direct[1].toLowerCase() as 'post' | 'story', id: direct[2] };
  if (msg.type === 'POST') {
    const id = c.match(/[?&]id=(\d+)/);
    if (id) return { type: 'post', id: id[1] };
  }
  if (msg.type === 'STORY') {
    const id = c.match(/[?&]id=(\d+)/);
    if (id) return { type: 'story', id: id[1] };
  }
  return null;
}
