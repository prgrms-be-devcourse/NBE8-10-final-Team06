// src/hooks/useStomp.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { syncAuthTokensFromCookies } from '../util/authStorageSync';
import { getCookie } from '../util/cookies';

function resolveAccessTokenForStomp(): string {
  syncAuthTokensFromCookies();
  let t = localStorage.getItem('accessToken');
  if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') return t.trim();
  const c = getCookie('accessToken');
  if (c && c !== 'null' && c !== 'undefined' && c.trim() !== '') return c.trim();
  return '';
}

interface UseStompProps {
  endpoint: string;
  onConnect?: () => void;
}

export const useStomp = ({ endpoint, onConnect }: UseStompProps) => {
  const clientRef = useRef<Client | null>(null);
  const onConnectRef = useRef<(() => void) | undefined>(undefined);
  const pendingSubsRef = useRef<
    { destination: string; callback: (message: IMessage) => void; id: number }[]
  >([]);
  const pendingSubSeqRef = useRef(0);
  const pendingPubsRef = useRef<{ destination: string; body: unknown }[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    const token = resolveAccessTokenForStomp();
    const socket = new SockJS(endpoint);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
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
          client.publish({ destination, body: JSON.stringify(body) });
        });
        setIsConnected(true);
        onConnectRef.current?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      pendingSubsRef.current = [];
      pendingPubsRef.current = [];
      if (client.active) {
        client.deactivate();
      }
    };
  }, [endpoint]);

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
    if (c && c.connected && c.active) {
      c.publish({ destination, body: JSON.stringify(body) });
      return;
    }
    // 연결 직전·일시 끊김 시 메시지가 유실되지 않도록 큐에 쌓았다가 onConnect 에서 전송
    pendingPubsRef.current.push({ destination, body });
  }, []);

  return { isConnected, subscribe, publish };
};
