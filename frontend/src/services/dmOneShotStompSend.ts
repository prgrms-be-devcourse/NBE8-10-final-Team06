import { Client, type IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { syncAuthTokensFromCookies } from '../util/authStorageSync';
import { getCookie } from '../util/cookies';
import { resolveSockJsStompUrl } from '../util/stompSockJsUrl';
import { buildDmStompMessageBody, dmStompAppMessage } from '../util/dmStompDestinations';
import type { DmSendMessageRequest } from '../types/dm';

function resolveAccessTokenForStomp(): string {
  syncAuthTokensFromCookies();
  let t = localStorage.getItem('accessToken');
  if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') return t.trim();
  const c = getCookie('accessToken');
  if (c && c !== 'null' && c !== 'undefined' && c.trim() !== '') return c.trim();
  return '';
}

function stompSendAuthHeaders(): Record<string, string> | undefined {
  const token = resolveAccessTokenForStomp();
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

export type DmBatchToPublish = { roomId: number; payloads: DmSendMessageRequest[] };

const CONNECT_MS = 15000;
const AFTER_PUBLISH_SETTLE_MS = 280;

/**
 * DM 채팅 페이지 밖에서 STOMP 로 메시지 전송(원샷 연결).
 * `useStomp` 인스턴스와 별도 Client 이므로 기존 DM 화면 로직과 충돌하지 않는다.
 */
export function publishDmBatchesOneShot(batches: DmBatchToPublish[]): Promise<void> {
  const flat = batches.filter((b) => b.payloads.length > 0);
  if (flat.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const token = resolveAccessTokenForStomp();
    const connectHeaders: Record<string, string> = {};
    if (token) connectHeaders.Authorization = `Bearer ${token}`;

    let settled = false;
    let disconnectExpected = false;

    const finishOk = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };
    const finishErr = (e: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      try {
        if (client.active) client.deactivate();
      } catch {
        /* noop */
      }
      reject(e);
    };

    const timeoutId = window.setTimeout(() => {
      finishErr(new Error('STOMP 연결 시간 초과'));
    }, CONNECT_MS);

    const client = new Client({
      webSocketFactory: () => new SockJS(resolveSockJsStompUrl('/ws')),
      connectHeaders,
      // 짧은 세션 후 바로 끊으므로 재연결은 사실상 쓰이지 않음(0은 구현에 따라 즉시 재시도 루프 위험)
      reconnectDelay: 60000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        window.clearTimeout(timeoutId);
        try {
          for (const { roomId, payloads } of flat) {
            const dest = dmStompAppMessage(roomId);
            for (const pl of payloads) {
              const headers = stompSendAuthHeaders();
              client.publish({
                destination: dest,
                body: JSON.stringify(buildDmStompMessageBody(pl)),
                ...(headers ? { headers } : {}),
              });
            }
          }
        } catch (e) {
          finishErr(e instanceof Error ? e : new Error(String(e)));
          return;
        }
        window.setTimeout(() => {
          disconnectExpected = true;
          try {
            if (client.active) client.deactivate();
          } catch {
            /* noop */
          }
          finishOk();
        }, AFTER_PUBLISH_SETTLE_MS);
      },
      onStompError: (frame: IFrame) => {
        finishErr(new Error(frame.headers?.message ?? 'STOMP 오류'));
      },
      onWebSocketClose: () => {
        if (disconnectExpected) return;
        if (!settled) {
          finishErr(new Error('WebSocket 연결이 끊겼습니다.'));
        }
      },
    });

    try {
      client.activate();
    } catch (e) {
      finishErr(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
