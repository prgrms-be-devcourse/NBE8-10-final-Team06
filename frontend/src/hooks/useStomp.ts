// src/hooks/useStomp.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage, type IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { syncAuthTokensFromCookies } from '../util/authStorageSync';
import { getCookie } from '../util/cookies';

/** DM 디버그 패널용 — CONNECT 토큰 유무·STOMP ERROR·WS 종료 시각 (토큰 원문은 넣지 않음) */
export type StompClientDiagnostics = {
  lastConnectAttemptAt: string | null;
  connectHeadersHadToken: boolean;
  tokenLength: number;
  lastConnectedAt: string | null;
  lastStompError: {
    command: string;
    headerMessage?: string;
    headers: Record<string, string>;
    body: string;
    at: string;
  } | null;
  lastWebSocketClose: {
    code: number;
    reason: string;
    wasClean: boolean;
    at: string;
  } | null;
};

const initialDiagnostics: StompClientDiagnostics = {
  lastConnectAttemptAt: null,
  connectHeadersHadToken: false,
  tokenLength: 0,
  lastConnectedAt: null,
  lastStompError: null,
  lastWebSocketClose: null,
};

function frameHeadersToRecord(headers: IFrame['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  if (headers && typeof headers === 'object') {
    for (const k of Object.keys(headers)) {
      const v = (headers as Record<string, unknown>)[k];
      out[k] = v == null ? '' : String(v);
    }
  }
  return out;
}

/**
 * effect cleanup(React Strict Mode·reconnectKey 변경) 직전에 쌓인 publish 를 다음 클라이언트가 이어 받는다.
 * 비우면 연결 직전에 보낸 DM 이 서버에 도달하지 않고 DB 에도 없어져 재입장 시 사라진 것처럼 보인다.
 */
let stompPublishCarryOver: { destination: string; body: unknown }[] = [];

function resolveAccessTokenForStomp(): string {
  syncAuthTokensFromCookies();
  let t = localStorage.getItem('accessToken');
  if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') return t.trim();
  const c = getCookie('accessToken');
  if (c && c !== 'null' && c !== 'undefined' && c.trim() !== '') return c.trim();
  return '';
}

/** SEND 마다 넣어 서버 Executor 인터셉터가 SecurityContext 를 복원할 수 있게 함(세션 Principal 누락 환경 대비). */
function stompSendAuthHeaders(): Record<string, string> | undefined {
  const token = resolveAccessTokenForStomp();
  if (!token) return undefined;
  return {
    Authorization: `Bearer ${token}`,
    accessToken: token,
  };
}

interface UseStompProps {
  endpoint: string;
  onConnect?: () => void;
  /**
   * 값이 바뀌면 STOMP 클라이언트를 새로 만든다. CONNECT 시 JWT(Authorization·accessToken)를 다시 심기 위함.
   * 서버는 CONNECT 로 Principal 을 세션에 두고 SEND 마다 SecurityContext 를 복원하므로 DM message/read 가 동작한다.
   * 토큰이 늦게 생기면 인증 없이 붙은 연검이 남지 않도록 reconnectKey 로 재연결한다.
   */
  reconnectKey?: string;
}

export const useStomp = ({ endpoint, onConnect, reconnectKey = '' }: UseStompProps) => {
  const clientRef = useRef<Client | null>(null);
  const onConnectRef = useRef<(() => void) | undefined>(undefined);
  const pendingSubsRef = useRef<
    { destination: string; callback: (message: IMessage) => void; id: number }[]
  >([]);
  const pendingSubSeqRef = useRef(0);
  const pendingPubsRef = useRef<{ destination: string; body: unknown }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stompDiagnostics, setStompDiagnostics] = useState<StompClientDiagnostics>(initialDiagnostics);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    setIsConnected(false);
    const token = resolveAccessTokenForStomp();
    const connectHeaders: Record<string, string> = {};
    if (token) {
      connectHeaders.Authorization = `Bearer ${token}`;
      // StompAuthChannelInterceptor: Authorization 없을 때 accessToken 네이티브 헤더 폴백
      connectHeaders.accessToken = token;
    }

    setStompDiagnostics({
      ...initialDiagnostics,
      lastConnectAttemptAt: new Date().toISOString(),
      connectHeadersHadToken: !!token,
      tokenLength: token.length,
    });

    if (stompPublishCarryOver.length > 0) {
      pendingPubsRef.current = [...stompPublishCarryOver, ...pendingPubsRef.current];
      stompPublishCarryOver = [];
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(endpoint),
      connectHeaders,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        const pending = [...pendingSubsRef.current];
        pendingSubsRef.current = [];
        pending.forEach(({ destination, callback }) => {
          client.subscribe(destination, callback);
        });
        const pubs = [...pendingPubsRef.current];
        pendingPubsRef.current = [];
        pubs.forEach(({ destination, body }) => {
          const headers = stompSendAuthHeaders();
          client.publish({
            destination,
            body: JSON.stringify(body),
            ...(headers ? { headers } : {}),
          });
        });
        setIsConnected(true);
        setStompDiagnostics((d) => ({
          ...d,
          lastConnectedAt: new Date().toISOString(),
          lastStompError: null,
        }));
        onConnectRef.current?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame: IFrame) => {
        setStompDiagnostics((d) => ({
          ...d,
          lastStompError: {
            command: frame.command,
            headerMessage: frame.headers?.message,
            headers: frameHeadersToRecord(frame.headers),
            body: frame.body ?? '',
            at: new Date().toISOString(),
          },
        }));
        setIsConnected(false);
      },
      onWebSocketClose: (evt: Event) => {
        const e = evt as CloseEvent;
        setStompDiagnostics((d) => ({
          ...d,
          lastWebSocketClose: {
            code: typeof e.code === 'number' ? e.code : 0,
            reason: e.reason ?? '',
            wasClean: !!e.wasClean,
            at: new Date().toISOString(),
          },
        }));
        setIsConnected(false);
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      pendingSubsRef.current = [];
      if (pendingPubsRef.current.length > 0) {
        stompPublishCarryOver = [...stompPublishCarryOver, ...pendingPubsRef.current];
        pendingPubsRef.current = [];
      }
      if (client.active) {
        client.deactivate();
      }
    };
  }, [endpoint, reconnectKey]);

  const subscribe = useCallback((destination: string, callback: (message: IMessage) => void) => {
    const c = clientRef.current;
    if (!c) return undefined;
    if (c.connected) {
      return c.subscribe(destination, callback);
    }
    const sid = ++pendingSubSeqRef.current;
    pendingSubsRef.current.push({ destination, callback, id: sid });
    return {
      unsubscribe: () => {
        pendingSubsRef.current = pendingSubsRef.current.filter((p) => p.id !== sid);
      },
    };
  }, []);

  const publish = useCallback((destination: string, body: unknown) => {
    const c = clientRef.current;
    // STOMP 세션이 살아 있으면 즉시 전송. `active`(ActivationState) 는 deactivate 직전 등에
    // connected 와 어긋날 수 있어 `connected && active` 조합이 SEND 를 큐에만 쌓고 onConnect 가
    // 다시 안 오면 /message·read 등이 늦거나 유실될 수 있음 (@stomp/stompjs Client 문서는 connected 기준).
    if (c && c.connected) {
      const headers = stompSendAuthHeaders();
      c.publish({
        destination,
        body: JSON.stringify(body),
        ...(headers ? { headers } : {}),
      });
      return;
    }
    // 연결 직전·일시 끊김 시 메시지가 유실되지 않도록 큐에 쌓았다가 onConnect 에서 전송
    pendingPubsRef.current.push({ destination, body });
  }, []);

  return { isConnected, subscribe, publish, stompDiagnostics };
};
