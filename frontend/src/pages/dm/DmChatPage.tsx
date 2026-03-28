// src/pages/dm/DmChatPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Image as ImageIcon, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { storyApi } from '../../api/story';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { useStomp } from '../../hooks/useStomp';
import { DmMessageResponse, MessageType, WebSocketEventPayload, type DmSendMessageRequest } from '../../types/dm';
import ProfileAvatar from '../../components/common/ProfileAvatar';
import { resolveDmAttachment } from '../../util/dmAttachment';
import { dmMessageDedupeKey, normalizeDmMessagesFromApi } from '../../util/dmMessageDedupe';
import { takePendingDmBatch } from '../../services/dmPendingSend';
import { mergeServerWithShareBackup, persistShareBackup, pruneShareBackupByServer } from '../../services/dmSharePersistence';
import { getReadMessageIdFromDmEvent, getTypingFieldsFromDmEvent } from '../../util/dmWebSocketPayload';
import DmRoomInfoModal from '../../components/dm/DmRoomInfoModal';

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

/** 서버 목록에 아직 없는 임시(음수 id) 메시지는 유지해 공유 카드가 잠깐 보였다 사라지지 않게 함 */
const mergeServerMessagesWithOptimistic = (
  prev: DmMessageResponse[],
  serverChronological: DmMessageResponse[]
): DmMessageResponse[] => {
  const optimistic = prev.filter((m) => m.id < 0);
  if (optimistic.length === 0) return serverChronological;
  const serverKeys = new Set(serverChronological.map((m) => dmMessageDedupeKey(m)));
  const stillPending = optimistic.filter((o) => !serverKeys.has(dmMessageDedupeKey(o)));
  if (stillPending.length === 0) return serverChronological;
  return [...serverChronological, ...stillPending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
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
const MessageItem = ({ msg, isMe, navigate, showReadStatus }: { msg: DmMessageResponse; isMe: boolean; navigate: ReturnType<typeof useNavigate>; showReadStatus: boolean; }) => {
  const attachmentData = resolveDmAttachment(msg);
  const isValid = msg.valid && !checkIsExpired(msg.content, attachmentData?.type === 'story' ? 'STORY' : attachmentData?.type === 'post' ? 'POST' : '');

  const openAttachment = async () => {
    if (!attachmentData) return;
    if (attachmentData.type === 'post') {
      navigate(`/post/${attachmentData.id}`);
      return;
    }
    const storyId = Number(attachmentData.id);
    if (!Number.isFinite(storyId)) return;
    const authorFallback = msg.content.match(/(?:^|[?&])u=(\d+)/);
    const fallbackUserId = authorFallback ? Number(authorFallback[1]) : NaN;
    try {
      const res = await storyApi.recordView(storyId);
      const ok = res.resultCode?.startsWith('200') || res.resultCode?.includes('-S-');
      if (ok && res.data?.userId != null) {
        navigate(`/story/${res.data.userId}`);
        return;
      }
    } catch {
      /* 시청 기록 API 실패 시 공유 링크의 작성자 id로 스토리 피드 진입 */
    }
    if (Number.isFinite(fallbackUserId) && fallbackUserId > 0) {
      navigate(`/story/${fallbackUserId}`);
      return;
    }
    alert('스토리를 열 수 없습니다.');
  };

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
            <AttachmentCard type={attachmentData.type as 'post' | 'story'} id={attachmentData.id} isValid={isValid} onClick={() => { void openAttachment(); }} />
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
  const { rooms, markAsRead, setRooms } = useDmStore();
  
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
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** getMessages 응답 적용 전에 더 최신 요청이 있으면 무시 (초기 로드가 플러시 결과를 덮어쓰는 것 방지) */
  const messagesRefreshGenRef = useRef(0);

  const { isConnected, subscribe, publish } = useStomp({ endpoint: '/ws' });

  const sendReadEvent = useCallback((messageId: number) => {
    if (isConnected && messageId > 0) {
      publish(`/app/dm/${roomId}/read`, { roomId: Number(roomId), userId, messageId });
    }
  }, [isConnected, roomId, userId, publish]);

  const sendReadEventRef = useRef(sendReadEvent);
  sendReadEventRef.current = sendReadEvent;

  // 로컬 카운트 초기화
  useEffect(() => {
    if (roomId) markAsRead(Number(roomId));
  }, [roomId, markAsRead]);

  // 직접 URL 진입 등으로 스토어에 방 요약이 없을 때 목록 재조회
  useEffect(() => {
    if (!roomId) return;
    const rid = Number(roomId);
    if (useDmStore.getState().rooms.some((r) => r.roomId === rid)) return;
    void dmApi.getRooms().then((res) => {
      if (res.resultCode.startsWith('200')) {
        setRooms(res.data);
      }
    });
  }, [roomId, setRooms]);

  // 메시지 초기 로드 — sendReadEvent/isConnected에 묶이지 않음(불필요 재요청·세대 꼬임 방지)
  useEffect(() => {
    if (!roomId) return;
    messagesRefreshGenRef.current += 1;
    const gen = messagesRefreshGenRef.current;
    setIsLoading(true);
    setMessages([]);
    setNextCursor(null);
    setHasNext(false);
    dmApi.getMessages(Number(roomId)).then((res) => {
      if (gen !== messagesRefreshGenRef.current) return;
      if (res.resultCode.startsWith('200')) {
        const rid = Number(roomId);
        const normalized = normalizeDmMessagesFromApi(res.data.messages);
        pruneShareBackupByServer(rid, normalized);
        const chronological = [...normalized].reverse();
        const merged = mergeServerWithShareBackup(rid, chronological);
        setMessages((prev) => mergeServerMessagesWithOptimistic(prev, merged));
        setNextCursor(res.data.nextCursor);
        setHasNext(res.data.hasNext);
        if (normalized.length > 0) {
          sendReadEventRef.current(normalized[0].id);
        }
      }
      setIsLoading(false);
    });
  }, [roomId]);

  // 무한 스크롤 (이전 메시지 로드)
  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasNext || !nextCursor || !roomId) return;

    setIsFetchingMore(true);
    // 현재 스크롤 높이 저장
    const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

    try {
      const res = await dmApi.getMessages(Number(roomId), nextCursor);
      if (res.resultCode.startsWith('200')) {
        const normalized = normalizeDmMessagesFromApi(res.data.messages);
        pruneShareBackupByServer(Number(roomId), normalized);
        const olderMessages = [...normalized].reverse();
        setMessages((prev) => [...olderMessages, ...prev]);
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

  const toOptimisticDmMessages = (batch: DmSendMessageRequest[], sender: number): DmMessageResponse[] => {
    const createdAt = new Date().toISOString();
    return batch.map((pl, i) => ({
      id: -(i + 1),
      type: pl.type as MessageType,
      content: pl.content,
      thumbnail: pl.thumbnail ?? null,
      valid: true,
      createdAt,
      senderId: sender,
    }));
  };

  // join → (지연 후) 세션에 쌓인 공유 메시지 전송 → 실시간 구독
  useEffect(() => {
    if (!isConnected || !roomId) return;
    const rid = Number(roomId);

    publish(`/app/dm/${rid}/join`, { roomId: rid, userId });

    const flushTimer = window.setTimeout(() => {
      const batch = takePendingDmBatch(rid);
      if (!batch?.length) return;

      persistShareBackup(rid, userId ?? 0, batch);

      setIsLoading(false);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id >= 0);
        return [...withoutTemp, ...toOptimisticDmMessages(batch, userId || 0)];
      });

      batch.forEach((pl) => publish(`/app/dm/${rid}/message`, pl));

      messagesRefreshGenRef.current += 1;
      const gen = messagesRefreshGenRef.current;
      window.setTimeout(() => {
        void dmApi.getMessages(rid).then((res) => {
          if (gen !== messagesRefreshGenRef.current) return;
          if (res.resultCode.startsWith('200')) {
            const normalized = normalizeDmMessagesFromApi(res.data.messages);
            pruneShareBackupByServer(rid, normalized);
            const chronological = [...normalized].reverse();
            const merged = mergeServerWithShareBackup(rid, chronological);
            setMessages((prev) => mergeServerMessagesWithOptimistic(prev, merged));
            setNextCursor(res.data.nextCursor);
            setHasNext(res.data.hasNext);
            if (normalized.length > 0) {
              sendReadEventRef.current(normalized[0].id);
            }
          }
        });
      }, 700);

      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }, 450);

    const wsHandler = (payload: { body: string }) => {
      const event = JSON.parse(payload.body) as WebSocketEventPayload<any>;
      switch (event.type) {
        case 'message':
          if (event.data) {
            const normalizedWs = normalizeDmMessagesFromApi([event.data]);
            const newMsg = normalizedWs[0];
            if (!newMsg) break;
            pruneShareBackupByServer(rid, [newMsg]);
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const fp = dmMessageDedupeKey(newMsg);
              const withoutMatchingTemp = prev.filter(
                (m) => m.id >= 0 || dmMessageDedupeKey(m) !== fp
              );
              return [...withoutMatchingTemp, newMsg].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
            if (newMsg.senderId !== userId) sendReadEventRef.current(newMsg.id);
            setTimeout(() => {
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 0);
          }
          break;
        case 'typing': {
          const t = getTypingFieldsFromDmEvent(event);
          if (t && t.userId !== userId) {
            setTypingUser(t.status === 'start' ? '상대방이 입력 중...' : null);
          }
          break;
        }
        case 'read': {
          const mid = getReadMessageIdFromDmEvent(event);
          if (mid != null) {
            setLastReadIdByOpponent((prev) => Math.max(prev, mid));
          }
          break;
        }
        case 'join':
        case 'leave':
          break;
        default:
          break;
      }
    };

    let subscription = subscribe(`/topic/dm.${rid}`, wsHandler);
    const subRetryTimers: number[] = [];
    if (!subscription) {
      [30, 120, 350].forEach((delay) => {
        subRetryTimers.push(
          window.setTimeout(() => {
            if (!subscription) {
              subscription = subscribe(`/topic/dm.${rid}`, wsHandler) ?? subscription;
            }
          }, delay)
        );
      });
    }

    return () => {
      window.clearTimeout(flushTimer);
      subRetryTimers.forEach((t) => window.clearTimeout(t));
      publish(`/app/dm/${rid}/leave`, { roomId: rid, userId });
      subscription?.unsubscribe();
    };
  }, [isConnected, roomId, userId, subscribe, publish]);

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
              {currentRoom?.participants[0] ? (
                <ProfileAvatar
                  fillContainer
                  authorUserId={currentRoom.participants[0].userId}
                  profileImageUrl={currentRoom.participants[0].profileImageUrl}
                  nickname={currentRoom.participants[0].nickname}
                />
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
          <button
            type="button"
            aria-label="채팅방 정보"
            onClick={() => setShowRoomInfo(true)}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', color: '#262626' }}
          >
            <Info size={24} />
          </button>
        </div>
      </header>

      <main ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        {/* 상단 무한 스크롤 관찰 포인트 */}
        <div ref={topObserverRef} style={{ height: '10px' }} />
        {isFetchingMore && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}><Loader2 className="animate-spin" size={20} color="#8e8e8e" /></div>}
        
        {isLoading && messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8e8e8e', marginTop: '20px' }}>로드 중...</p>
        ) : (
          messages.map((msg, idx) => (
            <MessageItem key={msg.id === -1 ? `temp-${idx}` : msg.id} msg={msg} isMe={msg.senderId === userId || msg.id === -1} navigate={navigate} showReadStatus={msg.id !== -1 && msg.id <= lastReadIdByOpponent} />
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

      <DmRoomInfoModal open={showRoomInfo} onClose={() => setShowRoomInfo(false)} room={currentRoom ?? null} />
    </div>
  );
};

export default DmChatPage;
