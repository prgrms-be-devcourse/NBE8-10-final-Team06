// src/pages/dm/DmChatPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Image as ImageIcon, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { useStomp } from '../../hooks/useStomp';
import { DmMessageResponse, WebSocketEventPayload } from '../../types/dm';

// --- 유틸리티: 스토리 만료 여부 체크 ---
const checkIsExpired = (content: string, type: string) => {
  if (type !== 'STORY') return false;
  const match = content.match(/v=(\d+)/);
  if (!match) return false;
  const createdTime = parseInt(match[1]);
  const now = Date.now();
  const createdMillis = createdTime < 10000000000 ? createdTime * 1000 : createdTime;
  return (now - createdMillis) > 24 * 60 * 60 * 1000;
};

// --- 첨부 카드 컴포넌트 ---
const AttachmentCard = ({ type, id, isValid, onClick }: { type: 'post' | 'story', id: string, isValid: boolean, onClick: () => void }) => {
  const isExpired = !isValid;
  return (
    <div onClick={isExpired ? undefined : onClick} style={{ width: '240px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #dbdbdb', cursor: isExpired ? 'default' : 'pointer', backgroundColor: isExpired ? '#fafafa' : '#fff', marginTop: '5px', opacity: isExpired ? 0.6 : 1, position: 'relative' }}>
      <div style={{ height: '140px', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: isExpired ? 'grayscale(1)' : 'none' }}>
        {type === 'post' ? <ImageIcon size={40} color="#8e8e8e" /> : <PlayCircle size={40} color="#0095f6" />}
        {isExpired && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <AlertCircle size={32} color="#ed4956" />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ed4956' }}>만료된 콘텐츠</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
          {type === 'post' ? '게시물' : '스토리'}
        </div>
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #efefef' }}>
        <div style={{ fontSize: '0.85rem', color: isExpired ? '#8e8e8e' : '#262626', fontWeight: '600' }}>
          {isExpired ? '볼 수 없는 콘텐츠입니다' : (type === 'post' ? '게시물 보기' : '스토리 보기')}
        </div>
      </div>
    </div>
  );
};

// --- 메시지 아이템 컴포넌트 ---
const MessageItem = ({ msg, isMe, navigate, showReadStatus }: { msg: DmMessageResponse; isMe: boolean; navigate: any; showReadStatus: boolean; }) => {
  const attachmentMatch = msg.content.match(/devstagram:\/\/(post|story)\?id=(\d+)/i);
  const attachmentData = attachmentMatch ? { type: attachmentMatch[1].toLowerCase(), id: attachmentMatch[2] } : null;
  const isValid = msg.valid && !checkIsExpired(msg.content, attachmentData?.type?.toUpperCase() || '');

  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row' : 'row-reverse' }}>
          {isMe && (
            <span style={{ fontSize: '0.7rem', color: '#0095f6', fontWeight: 'bold', visibility: showReadStatus ? 'hidden' : 'visible' }}>1</span>
          )}
          {!attachmentData ? (
            <div style={{ padding: '12px 16px', borderRadius: '22px', fontSize: '0.95rem', backgroundColor: isMe ? '#efefef' : '#fff', border: isMe ? 'none' : '1px solid #dbdbdb', color: '#262626', wordBreak: 'break-word' }}>
              {msg.content}
            </div>
          ) : (
            <AttachmentCard type={attachmentData.type as any} id={attachmentData.id} isValid={isValid} onClick={() => navigate(`/${attachmentData.type}/${attachmentData.id}`)} />
          )}
        </div>
        <span style={{ fontSize: '0.65rem', color: '#8e8e8e', marginTop: '4px', padding: '0 4px' }}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

const DmChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const { rooms, markAsRead } = useDmStore();
  
  // 현재 방 정보 찾기
  const currentRoom = rooms.find(r => r.roomId === Number(roomId));

  const [messages, setMessages] = useState<DmMessageResponse[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [lastReadIdByOpponent, setLastReadIdByOpponent] = useState<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isConnected, subscribe, publish } = useStomp({
    endpoint: '/ws',
    onConnect: () => {
      publish(`/app/dm/${roomId}/join`, { roomId: Number(roomId), userId });
    }
  });

  const sendReadEvent = useCallback((messageId: number) => {
    if (isConnected && messageId > 0) {
      publish(`/app/dm/${roomId}/read`, { roomId: Number(roomId), userId, messageId });
    }
  }, [isConnected, roomId, userId, publish]);

  // 로컬 카운트 초기화
  useEffect(() => {
    if (roomId) markAsRead(Number(roomId));
  }, [roomId, markAsRead]);

  // 메시지 초기 로드
  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    dmApi.getMessages(Number(roomId)).then(res => {
      if (res.resultCode.startsWith('200')) {
        setMessages([...res.data.messages].reverse());
        setNextCursor(res.data.nextCursor);
        setHasNext(res.data.hasNext);
        if (res.data.messages.length > 0) {
          sendReadEvent(res.data.messages[0].id); // 최신 메시지 읽음 처리 (백엔드는 역순)
        }
      }
      setIsLoading(false);
    });
  }, [roomId, sendReadEvent]);

  // 무한 스크롤 (이전 메시지 로드)
  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasNext || !nextCursor || !roomId) return;

    setIsFetchingMore(true);
    // 현재 스크롤 높이 저장
    const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

    try {
      const res = await dmApi.getMessages(Number(roomId), nextCursor);
      if (res.resultCode.startsWith('200')) {
        const olderMessages = [...res.data.messages].reverse();
        setMessages(prev => [...olderMessages, ...prev]);
        setNextCursor(res.data.nextCursor);
        setHasNext(res.data.hasNext);

        // 스크롤 위치 보정 (기존 위치 유지)
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - previousScrollHeight;
          }
        }, 0);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasNext, nextCursor, roomId]);

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreMessages();
      }
    }, { threshold: 0.5 });

    if (topObserverRef.current) {
      observer.observe(topObserverRef.current);
    }
    return () => observer.disconnect();
  }, [loadMoreMessages]);

  // 실시간 구독 및 전송 로직 (생략 - 기존 유지)
  useEffect(() => {
    if (isConnected && roomId) {
      const subscription = subscribe(`/topic/dm.${roomId}`, (payload) => {
        const event: WebSocketEventPayload<any> = JSON.parse(payload.body);
        switch (event.type) {
          case 'message':
            if (event.data) {
              const newMsg: DmMessageResponse = event.data;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev.filter(m => m.id !== -1), newMsg];
              });
              if (newMsg.senderId !== userId) sendReadEvent(newMsg.id);
              // 새 메시지 수신 시 하단 스크롤
              setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 0);
            }
            break;
          case 'typing':
            if (event.data && event.data.userId !== userId) setTypingUser(event.data.status === 'start' ? '상대방이 입력 중...' : null);
            break;
          case 'read':
            if (event.data && event.data.messageId) setLastReadIdByOpponent(prev => Math.max(prev, event.data.messageId!));
            break;

        }
      });
      return () => {
        if (isConnected) publish(`/app/dm/${roomId}/leave`, { roomId: Number(roomId), userId });
        subscription?.unsubscribe();
      };
    }
  }, [isConnected, roomId, userId, subscribe, sendReadEvent, publish]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    const content = inputValue.trim();
    setMessages(prev => [...prev, { id: -1, type: 'TEXT' as any, content, thumbnail: null, valid: true, createdAt: new Date().toISOString(), senderId: userId || 0 }]);
    setInputValue('');
    publish(`/app/dm/${roomId}/message`, { type: 'TEXT', content, thumbnail: null });
    setIsMeTyping(false);
    // 하단 이동
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isMeTyping) { setIsMeTyping(true); publish(`/app/dm/${roomId}/typing`, { roomId: Number(roomId), userId, status: 'start' }); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { setIsMeTyping(false); publish(`/app/dm/${roomId}/typing`, { roomId: Number(roomId), userId, status: 'stop' }); }, 2000);
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('방을 나가시겠습니까?')) return;
    try {
      const res = currentRoom?.isGroup 
        ? await dmApi.leaveGroupRoom(Number(roomId)) 
        : await dmApi.leave1v1Room(Number(roomId));
      if (res.resultCode.startsWith('200')) {
        navigate('/dm');
      }
    } catch (err) {
      alert('방 나가기 실패');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#fff', maxWidth: '935px', margin: '0 auto', borderLeft: '1px solid #dbdbdb', borderRight: '1px solid #dbdbdb' }}>
      <header style={{ height: '60px', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', backgroundColor: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/dm')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={24} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#efefef', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentRoom?.participants[0]?.profileImageUrl ? (
                <img src={currentRoom.participants[0].profileImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={20} color="#8e8e8e" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '0.95rem' }}>{currentRoom?.roomName || '채팅방'}</strong>
              {typingUser && <span style={{ fontSize: '0.75rem', color: '#0095f6' }}>입력 중...</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={handleLeaveRoom}
            style={{ color: '#ed4956', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            나가기
          </button>
          <Info size={24} style={{ cursor: 'pointer' }} />
        </div>
      </header>

      <main ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        {/* 상단 무한 스크롤 관찰 포인트 */}
        <div ref={topObserverRef} style={{ height: '10px' }} />
        {isFetchingMore && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}><Loader2 className="animate-spin" size={20} color="#8e8e8e" /></div>}
        
        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#8e8e8e', marginTop: '20px' }}>로드 중...</p>
        ) : (
          messages.map((msg, idx) => (
            <MessageItem key={msg.id === -1 ? `temp-${idx}` : msg.id} msg={msg} isMe={msg.userId === userId || msg.id === -1} navigate={navigate} showReadStatus={msg.id !== -1 && msg.id <= lastReadIdByOpponent} />
          ))
        )}
        
        {isMeTyping && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}><div style={{ padding: '8px 12px', borderRadius: '15px', backgroundColor: '#efefef', fontSize: '0.8rem', color: '#8e8e8e', fontStyle: 'italic' }}>입력 중...</div></div>}
      </main>

      <footer style={{ padding: '20px' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbdbdb', borderRadius: '30px', padding: '10px 20px' }}>
          <ImageIcon size={24} color="#262626" style={{ cursor: 'pointer' }} />
          <input type="text" value={inputValue} onChange={handleInputChange} placeholder="메시지 입력..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem' }} />
          <button type="submit" disabled={!inputValue.trim() || !isConnected} style={{ background: 'none', border: 'none', color: inputValue.trim() ? '#0095f6' : '#b2dffc', fontWeight: 'bold', fontSize: '1rem' }}>보내기</button>
        </form>
      </footer>
    </div>
  );
};

export default DmChatPage;
