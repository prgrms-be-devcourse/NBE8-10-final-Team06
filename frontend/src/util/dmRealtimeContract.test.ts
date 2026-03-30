import { describe, it, expect, beforeEach } from 'vitest';
import { parseBackendDmMessageFromTopicBody } from './dmWebSocketPayload';
import {
  mergePendingStompBatchIntoUiMessages,
  mergeRealtimeDmMessageIntoList,
} from './dmMessagesMerge';
import type { DmMessageResponse } from '../types/dm';
import {
  persistShareBackup,
  mergeServerWithShareBackup,
  pruneShareBackupByServer,
} from '../services/dmSharePersistence';

/** 백엔드 `WebSocketEventPayload` + `DmMessageResponse` (Jackson camelCase) */
const sampleTopicMessageBody = JSON.stringify({
  type: 'message',
  data: {
    id: 42,
    type: 'TEXT',
    content: 'hello-ws',
    thumbnail: null,
    valid: true,
    createdAt: '2026-03-30T12:00:00',
    senderId: 7,
  },
});

describe('DM STOMP 계약 (백엔드 DmWebSocketController)', () => {
  it('parseBackendDmMessageFromTopicBody 가 message 래퍼에서 DmMessageResponse 를 복원한다', () => {
    const msg = parseBackendDmMessageFromTopicBody(sampleTopicMessageBody);
    expect(msg).not.toBeNull();
    expect(msg!.id).toBe(42);
    expect(msg!.content).toBe('hello-ws');
    expect(msg!.senderId).toBe(7);
    expect(msg!.type).toBe('TEXT');
  });

  it('Jackson LocalDateTime 배열이어도 parseBackendDmMessageFromTopicBody 가 복원한다', () => {
    const body = JSON.stringify({
      type: 'message',
      data: {
        id: 99,
        type: 'TEXT',
        content: 'dt-array',
        thumbnail: null,
        valid: true,
        createdAt: [2026, 3, 30, 14, 30, 0],
        senderId: 3,
      },
    });
    const msg = parseBackendDmMessageFromTopicBody(body);
    expect(msg).not.toBeNull();
    expect(msg!.id).toBe(99);
    expect(msg!.content).toBe('dt-array');
    expect(msg!.senderId).toBe(3);
  });

  it('data 가 JSON 문자열로 한 겹 감싸져 있어도 message 를 복원한다', () => {
    const inner = JSON.stringify({
      id: 100,
      type: 'TEXT',
      content: 'wrapped',
      thumbnail: null,
      valid: true,
      createdAt: '2026-03-30T12:00:00',
      senderId: 5,
    });
    const body = JSON.stringify({ type: 'message', data: inner });
    const msg = parseBackendDmMessageFromTopicBody(body);
    expect(msg).not.toBeNull();
    expect(msg!.id).toBe(100);
    expect(msg!.content).toBe('wrapped');
  });

  it('mergeRealtimeDmMessageIntoList 가 신규 서버 메시지를 시간순으로 합친다', () => {
    const prev: DmMessageResponse[] = [
      {
        id: -1,
        type: 'TEXT',
        content: 'hello-ws',
        thumbnail: null,
        valid: true,
        createdAt: '2026-03-30T11:59:00.000Z',
        senderId: 7,
      },
    ];
    const incoming: DmMessageResponse = {
      id: 42,
      type: 'TEXT',
      content: 'hello-ws',
      thumbnail: null,
      valid: true,
      createdAt: '2026-03-30T12:00:00.000Z',
      senderId: 7,
    };
    const { next, isNewServerMessage } = mergeRealtimeDmMessageIntoList(prev, incoming);
    expect(isNewServerMessage).toBe(true);
    expect(next.some((m) => m.id === 42)).toBe(true);
    expect(next.some((m) => m.id === -1)).toBe(false);
  });
});

describe('STOMP 대기 배치 + 일반 낙관적 메시지 병합', () => {
  it('mergePendingStompBatchIntoUiMessages 가 배치와 겹치지 않는 낙관적 메시지는 유지한다', () => {
    const prev: DmMessageResponse[] = [
      {
        id: -1,
        type: 'TEXT',
        content: '일반 채팅',
        thumbnail: null,
        valid: true,
        createdAt: '2026-03-30T12:00:00.000Z',
        senderId: 1,
      },
    ];
    const next = mergePendingStompBatchIntoUiMessages(prev, [{ type: 'TEXT', content: '공유됨', thumbnail: null }], 1);
    expect(next.some((m) => m.content === '일반 채팅')).toBe(true);
    expect(next.some((m) => m.content === '공유됨')).toBe(true);
  });

  it('동일 dedupe 키의 낙관적 메시지는 배치로 대체된다', () => {
    const prev: DmMessageResponse[] = [
      {
        id: -99,
        type: 'TEXT',
        content: 'same',
        thumbnail: null,
        valid: true,
        createdAt: '2026-03-30T12:00:00.000Z',
        senderId: 2,
      },
    ];
    const next = mergePendingStompBatchIntoUiMessages(prev, [{ type: 'TEXT', content: 'same', thumbnail: null }], 2);
    const sameSenders = next.filter((m) => m.content === 'same' && Number(m.senderId) === 2);
    expect(sameSenders.length).toBe(1);
    expect(sameSenders[0].id).toBeLessThan(0);
  });
});

describe('TEXT 로컬 백업 (재입장 시 서버 지연·실패 대비)', () => {
  const lsStore: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
    globalThis.localStorage = {
      getItem: (k: string) => (k in lsStore ? lsStore[k] : null),
      setItem: (k: string, v: string) => {
        lsStore[k] = v;
      },
      removeItem: (k: string) => {
        delete lsStore[k];
      },
      clear: () => {
        for (const k of Object.keys(lsStore)) delete lsStore[k];
      },
      key: () => null,
      length: 0,
    } as Storage;
  });

  it('persistShareBackup 가 TEXT 를 저장하고 mergeServerWithShareBackup 이 서버에 없을 때 복원한다', () => {
    persistShareBackup(1, 9, [{ type: 'TEXT', content: 'only-local', thumbnail: null }]);
    const server: DmMessageResponse[] = [
      {
        id: 1,
        type: 'TEXT',
        content: 'old',
        thumbnail: null,
        valid: true,
        createdAt: '2026-03-30T10:00:00.000Z',
        senderId: 2,
      },
    ];
    const merged = mergeServerWithShareBackup(1, server);
    const restored = merged.find((m) => m.content === 'only-local' && m.senderId === 9);
    expect(restored).toBeDefined();
    expect(restored!.id).toBeLessThan(0);
  });

  it('pruneShareBackupByServer 가 동일 본문·발신자면 TEXT 백업을 제거한다', () => {
    persistShareBackup(1, 9, [{ type: 'TEXT', content: 'synced', thumbnail: null }]);
    const server: DmMessageResponse[] = [
      {
        id: 99,
        type: 'TEXT',
        content: 'synced',
        thumbnail: null,
        valid: true,
        createdAt: '2026-03-30T11:00:00.000Z',
        senderId: 9,
      },
    ];
    pruneShareBackupByServer(1, server);
    const merged = mergeServerWithShareBackup(1, server);
    expect(merged.filter((m) => m.content === 'synced' && m.senderId === 9).length).toBe(1);
  });
});
