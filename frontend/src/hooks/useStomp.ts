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
      if (client.active) {
        client.deactivate();
      }
    };
  }, [endpoint]);

  const subscribe = useCallback((destination: string, callback: (message: IMessage) => void) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    return clientRef.current.subscribe(destination, callback);
  }, []);

  const publish = useCallback((destination: string, body: any) => {
    // 연결이 활성화되어 있을 때만 전송하고, 실패 시에는 조용히 넘김 (경고 제거)
    if (clientRef.current && clientRef.current.connected && clientRef.current.active) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body)
      });
    }
  }, []);

  return { isConnected, subscribe, publish };
};
