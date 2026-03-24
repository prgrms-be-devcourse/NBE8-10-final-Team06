import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { dmApi } from '../../api/dm';
import { DmMessageResponse, WebSocketEvent } from '../../types/dm';

const DmChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DmMessageResponse[]>([]);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // 초기 메시지 로드 (백엔드 Cursor 방식)
    dmApi.getMessages(Number(roomId)).then(res => {
      if (res.resultCode.includes('-S-')) setMessages(res.data.content.reverse());
    });

    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      onConnect: () => {
        // 백엔드 브로드캐스트 주소: /topic/dm.{roomId}
        client.subscribe(`/topic/dm.${roomId}`, (payload) => {
          const event: WebSocketEvent = JSON.parse(payload.body);
          
          switch (event.type) {
            case 'message':
              if (event.data) setMessages(prev => [...prev, event.data!]);
              break;
            case 'typing':
              setTypingUserId(event.status === 'start' ? event.userId! : null);
              break;
            case 'read':
              // 읽음 처리 로직 추후 보완
              break;
          }
        });

        // 입장 알림 (백엔드: /app/dm/{roomId}/join)
        client.publish({ 
          destination: `/app/dm/${roomId}/join`, 
          body: JSON.stringify({ roomId: Number(roomId), userId: Number(localStorage.getItem('userId')) }) 
        });
      }
    });

    client.activate();
    stompClientRef.current = client;
    return () => client.deactivate();
  }, [roomId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 백엔드 발행 주소: /app/dm/{roomId}/message
    stompClientRef.current?.publish({
      destination: `/app/dm/${roomId}/message`,
      body: JSON.stringify({ content: inputValue })
    });
    setInputValue('');
  };

  const [inputValue, setInputValue] = useState('');
  return (
    <div>
      <div style={{ height: '70vh', overflowY: 'auto', border: '1px solid #dbdbdb', padding: '10px' }}>
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: '10px' }}>
            <p>{m.content}</p>
            <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        {typingUserId && <p style={{ color: '#8e8e8e' }}>유저 {typingUserId}님이 입력 중...</p>}
      </div>
      <form onSubmit={handleSend}>
        <input 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder="메시지 입력..." 
          style={{ width: '80%' }} 
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );
};

export default DmChatPage;
