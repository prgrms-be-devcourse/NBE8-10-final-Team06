import { describe, it, expect } from 'vitest';
import { pickDmSenderIdFromRow } from './dmMessageDedupe';

describe('pickDmSenderIdFromRow', () => {
  it('루트 userId 보다 중첩 sender.id 를 우선한다', () => {
    const r = {
      id: 1,
      content: 'hi',
      userId: 10,
      sender: { id: 20, nickname: 'peer' },
    } as Record<string, unknown>;
    expect(pickDmSenderIdFromRow(r)).toBe(20);
  });

  it('senderId 가 있으면 userId 보다 senderId', () => {
    const r = { id: 1, senderId: 5, userId: 99 } as Record<string, unknown>;
    expect(pickDmSenderIdFromRow(r)).toBe(5);
  });

  it('발신자 전용 필드가 없을 때만 루트 userId', () => {
    const r = { id: 1, type: 'TEXT', content: 'x', userId: 7 } as Record<string, unknown>;
    expect(pickDmSenderIdFromRow(r)).toBe(7);
  });
});
