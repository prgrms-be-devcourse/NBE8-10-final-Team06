// src/pages/dm/DmChatPage.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Image as ImageIcon, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { authApi } from '../../api/auth';
import { storyApi } from '../../api/story';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { useStomp } from '../../hooks/useStomp';
import type { SignupResponse } from '../../types/auth';
import {
  DmMessageResponse,
  MessageType,
  WebSocketEventPayload,
  type DmMessageSliceResponse,
  type DmSendMessageRequest,
} from '../../types/dm';
import ProfileAvatar from '../../components/common/ProfileAvatar';
import { resolveDmAttachment } from '../../util/dmAttachment';
import {
  dmMessageDedupeKey,
  isDmMessageLikelyMine,
  normalizeDmMessagesFromApi,
} from '../../util/dmMessageDedupe';
import { takePendingDmBatch } from '../../services/dmPendingSend';
import { mergeServerWithShareBackup, persistShareBackup, pruneShareBackupByServer } from '../../services/dmSharePersistence';
import {
  extractDmMessageFromStompBody,
  getReadMessageIdFromDmEvent,
  getTypingFieldsFromDmEvent,
  parseDmMessagePayload,
  parseDmWebSocketJson,
  parseWrappedDmMessageEvent,
  stompMessageBodyToString,
} from '../../util/dmWebSocketPayload';
import { isRsSuccess } from '../../util/rsData';
import { mergePollSliceIntoMessages } from '../../util/dmMessagesMerge';
import { readJwtSubAsUserId } from '../../util/jwtUserId';
import DmRoomInfoModal from '../../components/dm/DmRoomInfoModal';

/** 채팅창 REST 폴링 주기(ms) — STOMP 누락 시에도 메시지 동기화 */
const DM_POLL_INTERVAL_MS = 400;

/** /auth/me data.id 와 일부 환경의 userId 별칭 */
function readMeUserId(data: SignupResponse): number | null {
  const ext = data as SignupResponse & { userId?: unknown };
  const raw: unknown = ext.id ?? ext.userId;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

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
  const { userId, setSessionUserId, nickname: myNickname } = useAuthStore();
  /** JWT sub + /auth/me 로 확정한 본인 id — 스토어 userId 오염·me 지연 시에도 말풍선·typing 이 맞게 */
  const [selfIdFromJwt, setSelfIdFromJwt] = useState<number | null>(() => readJwtSubAsUserId());
  const effectiveSelfId = useMemo(() => {
    if (selfIdFromJwt != null && Number.isFinite(selfIdFromJwt)) return selfIdFromJwt;
    const fromToken = readJwtSubAsUserId();
    if (fromToken != null) return fromToken;
    if (userId != null && Number.isFinite(Number(userId))) return Number(userId);
    return Number.NaN;
  }, [selfIdFromJwt, userId]);
  const myUserIdNum = effectiveSelfId;
  const myNickNorm = myNickname?.trim().toLowerCase() ?? '';
  const { rooms, markAsRead, setRooms } = useDmStore();
  
  // 현재 방 정보 찾기
  const currentRoom = rooms.find(r => r.roomId === Number(roomId));

  /**
   * 1:1 헤더/아바타는 상대만. 서버는 보통 본인을 participants 에서 제외하지만,
   * 스토어 userId 가 잠깐 틀리면 단일 요소가 본인으로 보일 수 있어 userId·닉으로 한 번 더 걸러낸다.
   */
  const headerPeer = useMemo(() => {
    if (!currentRoom) return null;
    if (currentRoom.isGroup) return currentRoom.participants[0] ?? null;
    const parts = currentRoom.participants;
    const selfIdOk = Number.isFinite(myUserIdNum);

    const notSelfByNick = (p: (typeof parts)[0]) => {
      const pn = p.nickname?.trim().toLowerCase() ?? '';
      return !myNickNorm || pn === '' || pn !== myNickNorm;
    };

    if (parts.length === 1) {
      const only = parts[0];
      if (!only) return null;
      if (selfIdOk && Number(only.userId) === myUserIdNum) return null;
      if (myNickNorm && only.nickname?.trim().toLowerCase() === myNickNorm) return null;
      return only;
    }

    if (selfIdOk) {
      const byId = parts.find((p) => Number(p.userId) !== myUserIdNum);
      if (byId) return byId;
    }
    const byNick = parts.find(notSelfByNick);
    return byNick ?? parts[0] ?? null;
  }, [currentRoom, myUserIdNum, myNickNorm]);

  const headerTitle = useMemo(() => {
    if (!currentRoom) return '채팅방';
    if (currentRoom.isGroup) return currentRoom.roomName || '그룹 채팅';
    // 1:1: roomName 은 DB에 상대 닉으로 고정돼 있지 않을 수 있어(본인 닉으로 보이는 경우) 쓰지 않음
    const nick = headerPeer?.nickname?.trim();
    return nick && nick.length > 0 ? nick : '채팅';
  }, [currentRoom, headerPeer]);

  const [messages, setMessages] = useState<DmMessageResponse[]>([]);
  const [inputValue, setInputValue] = useState('');
  /** 상대 typing — 말풍선 영역에 표시 */
  const [opponentTypingLabel, setOpponentTypingLabel] = useState<string | null>(null);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [lastReadIdByOpponent, setLastReadIdByOpponent] = useState<number>(0);
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  // 채팅방 진입 전에도 JWT id 를 가능한 빨리 채워 말풍선 좌우 오판을 줄임(roomId effect 와 중복 호출되어도 무방)
  useEffect(() => {
    void authApi.me().then((res) => {
      if (!isRsSuccess(res.resultCode) || res.data == null) return;
      const apiId = readMeUserId(res.data);
      if (apiId == null) return;
      setSelfIdFromJwt((prev) => (prev === apiId ? prev : apiId));
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticMsgIdRef = useRef(-1);
  /** getMessages 응답 적용 전에 더 최신 요청이 있으면 무시 (초기 로드가 플러시 결과를 덮어쓰는 것 방지) */
  const messagesRefreshGenRef = useRef(0);
  const roomIdRef = useRef<string | undefined>(roomId);
  roomIdRef.current = roomId;

  /** 상대 typing 직후 REST 동기화(디바운스) — 메시지 지연 완화 */
  const typingPollDebounceRef = useRef<number | null>(null);

  /** STOMP 핸들러·read 등에서 최신 본인 id (클로저 stale 방지) */
  const effectiveSelfIdRef = useRef(effectiveSelfId);
  effectiveSelfIdRef.current = effectiveSelfId;

  const { isConnected, subscribe, publish } = useStomp({ endpoint: '/ws' });

  const mergeFreshSliceIntoMessages = useCallback((rid: number, slice: DmMessageSliceResponse) => {
    const normalized = normalizeDmMessagesFromApi(slice.messages ?? []);
    pruneShareBackupByServer(rid, normalized);
    const chronological = [...normalized].reverse();
    const merged = mergeServerWithShareBackup(rid, chronological);
    setMessages((prev) => mergeServerMessagesWithOptimistic(prev, merged));
    setNextCursor(slice.nextCursor);
    setHasNext(slice.hasNext);
  }, []);

  const sendReadEvent = useCallback(
    (messageId: number) => {
      const actor = effectiveSelfIdRef.current;
      if (!isConnected || messageId <= 0 || !Number.isFinite(actor)) return;
      publish(`/app/dm/${roomId}/read`, { roomId: Number(roomId), userId: actor, messageId });
    },
    [isConnected, roomId, publish]
  );

  const sendReadEventRef = useRef(sendReadEvent);
  sendReadEventRef.current = sendReadEvent;

  // 로컬 카운트 초기화
  useEffect(() => {
    if (roomId) markAsRead(Number(roomId));
  }, [roomId, markAsRead]);

  // 채팅 진입 시마다 목록 갱신 — participants(상대만 포함)와 닉네임이 최신이어야 헤더가 틀어지지 않음
  useEffect(() => {
    if (!roomId) return;
    void dmApi.getRooms().then((res) => {
      if (isRsSuccess(res.resultCode)) {
        setRooms(res.data);
      }
    });
  }, [roomId, setRooms, userId]);

  // JWT 기준 id 와 스토어 userId 정합 — 말풍선/헤더 판별 오류 방지
  useEffect(() => {
    if (!roomId) return;
    void authApi.me().then((res) => {
      if (!isRsSuccess(res.resultCode) || res.data == null) return;
      const apiId = readMeUserId(res.data);
      if (apiId == null) return;
      setSelfIdFromJwt(apiId);
      const storeId = useAuthStore.getState().userId;
      if (storeId == null || Number(storeId) !== apiId) {
        setSessionUserId(apiId);
      }
      void dmApi.getRooms().then((r2) => {
        if (isRsSuccess(r2.resultCode)) {
          setRooms(r2.data);
        }
      });
    });
  }, [roomId, setSessionUserId, setRooms]);

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
      if (isRsSuccess(res.resultCode) && res.data) {
        const rid = Number(roomId);
        mergeFreshSliceIntoMessages(rid, res.data);
        const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
        if (normalized.length > 0) {
          sendReadEventRef.current(normalized[0].id);
        }
      }
      setIsLoading(false);
    });
  }, [roomId, mergeFreshSliceIntoMessages]);

  // STOMP 실시간이 누락돼도 REST로 동기화 — 초기 로드 완료를 기다리지 않음(상대 메시지 지연 완화). visibility 로는 막지 않음(백그라운드 탭에서도 동기화).
  useEffect(() => {
    if (!roomId) return;
    const rid = Number(roomId);
    const tick = () => {
      if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
      void dmApi.getMessages(rid).then((res) => {
        if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
        if (!isRsSuccess(res.resultCode) || !res.data) return;
        const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
        pruneShareBackupByServer(rid, normalized);
        const incoming = [...normalized].reverse();
        setMessages((prev) => mergePollSliceIntoMessages(prev, incoming));
      });
    };
    tick();
    const intervalId = window.setInterval(tick, DM_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId]);

  // 무한 스크롤 (이전 메시지 로드)
  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasNext || !nextCursor || !roomId) return;

    setIsFetchingMore(true);
    // 현재 스크롤 높이 저장
    const previousScrollHeight = scrollRef.current?.scrollHeight || 0;

    try {
      const res = await dmApi.getMessages(Number(roomId), nextCursor);
      if (isRsSuccess(res.resultCode) && res.data) {
        const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
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

  // STOMP 연결된 뒤에만 join / 구독 (미연결 시 subscribe 실패로 실시간 메시지 누락 방지)
  useEffect(() => {
    if (!isConnected || !roomId) {
      return () => {};
    }
    const rid = Number(roomId);
    const actorId = effectiveSelfIdRef.current;
    if (!Number.isFinite(actorId)) {
      return () => {};
    }

    publish(`/app/dm/${rid}/join`, { roomId: rid, userId: actorId });

    const flushTimer = window.setTimeout(() => {
      const batch = takePendingDmBatch(rid);
      if (!batch?.length) return;

      persistShareBackup(rid, actorId, batch);

      setIsLoading(false);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id >= 0);
        return [...withoutTemp, ...toOptimisticDmMessages(batch, actorId)];
      });

      batch.forEach((pl) => publish(`/app/dm/${rid}/message`, pl));

      messagesRefreshGenRef.current += 1;
      const gen = messagesRefreshGenRef.current;
      window.setTimeout(() => {
        void dmApi.getMessages(rid).then((res) => {
          if (gen !== messagesRefreshGenRef.current) return;
          if (isRsSuccess(res.resultCode) && res.data) {
            mergeFreshSliceIntoMessages(rid, res.data);
            const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
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

    const onDmTopicMessage = (payloadBody: string) => {
      const newMsg = extractDmMessageFromStompBody(payloadBody);
      if (newMsg) {
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
        const selfNow = effectiveSelfIdRef.current;
        if (Number.isFinite(selfNow) && Number(newMsg.senderId) !== selfNow) {
          sendReadEventRef.current(newMsg.id);
        }
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 0);
        return;
      }

      let event: WebSocketEventPayload<unknown>;
      let parsedRoot: unknown;
      try {
        parsedRoot = parseDmWebSocketJson(payloadBody);
        if (parsedRoot == null || typeof parsedRoot !== 'object') return;
        event = parsedRoot as WebSocketEventPayload<unknown>;
      } catch {
        return;
      }

      const eventKind = String(event.type ?? '').toLowerCase();
      switch (eventKind) {
        case 'message': {
          const fallbackMsg =
            parseWrappedDmMessageEvent(parsedRoot) ?? parseDmMessagePayload(event.data);
          if (!fallbackMsg) break;
          pruneShareBackupByServer(rid, [fallbackMsg]);
          setMessages((prev) => {
            if (prev.some((m) => m.id === fallbackMsg.id)) return prev;
            const fp = dmMessageDedupeKey(fallbackMsg);
            const withoutMatchingTemp = prev.filter(
              (m) => m.id >= 0 || dmMessageDedupeKey(m) !== fp
            );
            return [...withoutMatchingTemp, fallbackMsg].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          const selfNow2 = effectiveSelfIdRef.current;
          if (Number.isFinite(selfNow2) && Number(fallbackMsg.senderId) !== selfNow2) {
            sendReadEventRef.current(fallbackMsg.id);
          }
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 0);
          break;
        }
        case 'typing': {
          const t = getTypingFieldsFromDmEvent(event);
          if (!t) break;
          const typingUid = Number(t.userId);
          if (!Number.isFinite(typingUid) || typingUid <= 0) break;

          const roomSnap = useDmStore.getState().rooms.find((r) => r.roomId === rid);
          const selfNow = effectiveSelfIdRef.current;

          const runTypingPollDebounced = () => {
            if (t.status !== 'start') return;
            if (typingPollDebounceRef.current) window.clearTimeout(typingPollDebounceRef.current);
            typingPollDebounceRef.current = window.setTimeout(() => {
              typingPollDebounceRef.current = null;
              if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
              void dmApi.getMessages(rid).then((res) => {
                if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
                if (!isRsSuccess(res.resultCode) || !res.data) return;
                const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
                pruneShareBackupByServer(rid, normalized);
                const incoming = [...normalized].reverse();
                setMessages((prev) => mergePollSliceIntoMessages(prev, incoming));
              });
            }, 280);
          };

          if (roomSnap?.isGroup) {
            if (Number.isFinite(selfNow) && typingUid === selfNow) break;
            const nick =
              roomSnap.participants?.find((p) => Number(p.userId) === typingUid)?.nickname?.trim() ||
              '상대방';
            setOpponentTypingLabel(t.status === 'start' ? `${nick}님이 입력 중...` : null);
            runTypingPollDebounced();
            break;
          }

          const parts = roomSnap?.participants ?? [];
          // 1:1에서 participant 1명만 오는 경우(상대만) — selfNow 오염과 무관하게 먼저 처리
          if (parts.length === 1 && typingUid === Number(parts[0].userId)) {
            const nick = parts[0].nickname?.trim() || '상대방';
            setOpponentTypingLabel(t.status === 'start' ? `${nick}님이 입력 중...` : null);
            runTypingPollDebounced();
            break;
          }

          if (Number.isFinite(selfNow) && typingUid === selfNow) break;

          // 1:1: 본인이 아닌 typing 은 상대로 표시(participants 2명·비어 있음 등)
          if (Number.isFinite(selfNow) && typingUid !== selfNow) {
            const nick =
              parts.find((p) => Number(p.userId) === typingUid)?.nickname?.trim() ||
              parts.find((p) => Number(p.userId) !== selfNow)?.nickname?.trim() ||
              '상대방';
            setOpponentTypingLabel(t.status === 'start' ? `${nick}님이 입력 중...` : null);
            runTypingPollDebounced();
            break;
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

    const subscription = subscribe(`/topic/dm.${rid}`, (frame) => {
      const payloadBody = stompMessageBodyToString(frame);
      if (!payloadBody) return;
      onDmTopicMessage(payloadBody);
    });

    const pollSoon = window.setTimeout(() => {
      if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
      void dmApi.getMessages(rid).then((res) => {
        if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
        if (!isRsSuccess(res.resultCode) || !res.data) return;
        const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
        pruneShareBackupByServer(rid, normalized);
        const incoming = [...normalized].reverse();
        setMessages((prev) => mergePollSliceIntoMessages(prev, incoming));
      });
    }, 250);

    return () => {
      window.clearTimeout(flushTimer);
      window.clearTimeout(pollSoon);
      if (typingPollDebounceRef.current) {
        window.clearTimeout(typingPollDebounceRef.current);
        typingPollDebounceRef.current = null;
      }
      setOpponentTypingLabel(null);
      publish(`/app/dm/${rid}/leave`, { roomId: rid, userId: actorId });
      subscription?.unsubscribe();
    };
  }, [isConnected, roomId, userId, selfIdFromJwt, effectiveSelfId, subscribe, publish, mergeFreshSliceIntoMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const actor = effectiveSelfIdRef.current;
    if (!Number.isFinite(actor)) return;
    const content = inputValue.trim();
    const tempId = optimisticMsgIdRef.current--;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        type: 'TEXT' as MessageType,
        content,
        thumbnail: null,
        valid: true,
        createdAt: new Date().toISOString(),
        senderId: actor,
      },
    ]);
    setInputValue('');
    const rid = Number(roomId);
    persistShareBackup(rid, actor, [{ type: 'TEXT', content, thumbnail: null }]);
    publish(`/app/dm/${rid}/message`, { type: 'TEXT', content, thumbnail: null });
    setIsMeTyping(false);
    [400, 1200, 2800].forEach((ms) => {
      window.setTimeout(() => {
        if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
        void dmApi.getMessages(rid).then((res) => {
          if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
          if (isRsSuccess(res.resultCode) && res.data) {
            mergeFreshSliceIntoMessages(rid, res.data);
          }
        });
      }, ms);
    });
    // 하단 이동
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const actor = effectiveSelfIdRef.current;
    if (!Number.isFinite(actor)) return;
    if (!isMeTyping) {
      setIsMeTyping(true);
      publish(`/app/dm/${roomId}/typing`, { roomId: Number(roomId), userId: actor, status: 'start' });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsMeTyping(false);
      publish(`/app/dm/${roomId}/typing`, { roomId: Number(roomId), userId: actor, status: 'stop' });
    }, 2000);
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('방을 나가시겠습니까?')) return;
    try {
      const res = currentRoom?.isGroup 
        ? await dmApi.leaveGroupRoom(Number(roomId)) 
        : await dmApi.leave1v1Room(Number(roomId));
      if (isRsSuccess(res.resultCode)) {
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
              {headerPeer ? (
                <ProfileAvatar
                  fillContainer
                  authorUserId={headerPeer.userId}
                  profileImageUrl={headerPeer.profileImageUrl}
                  nickname={headerPeer.nickname}
                />
              ) : (
                <ImageIcon size={20} color="#8e8e8e" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '0.95rem' }}>{headerTitle}</strong>
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
            <MessageItem
              key={msg.id < 0 ? `tmp-${msg.id}-${idx}` : msg.id}
              msg={msg}
              isMe={isDmMessageLikelyMine(msg, myUserIdNum, {
                isGroup: currentRoom?.isGroup ?? false,
                opponentUserId: headerPeer?.userId,
              })}
              navigate={navigate}
              showReadStatus={msg.id > 0 && msg.id <= lastReadIdByOpponent}
            />
          ))
        )}

        {opponentTypingLabel && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '22px',
                backgroundColor: '#fff',
                border: '1px solid #dbdbdb',
                fontSize: '0.85rem',
                color: '#8e8e8e',
                fontStyle: 'italic',
                maxWidth: '75%',
              }}
            >
              {opponentTypingLabel}
            </div>
          </div>
        )}

        {isMeTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '15px', backgroundColor: '#efefef', fontSize: '0.8rem', color: '#8e8e8e', fontStyle: 'italic' }}>
              입력 중...
            </div>
          </div>
        )}
      </main>

      <footer style={{ padding: '20px' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbdbdb', borderRadius: '30px', padding: '10px 20px' }}>
          <ImageIcon size={24} color="#262626" style={{ cursor: 'pointer' }} />
          <input type="text" value={inputValue} onChange={handleInputChange} placeholder="메시지 입력..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem' }} />
          <button type="submit" disabled={!inputValue.trim()} style={{ background: 'none', border: 'none', color: inputValue.trim() ? '#0095f6' : '#b2dffc', fontWeight: 'bold', fontSize: '1rem' }}>보내기</button>
        </form>
      </footer>

      <DmRoomInfoModal open={showRoomInfo} onClose={() => setShowRoomInfo(false)} room={currentRoom ?? null} />
    </div>
  );
};

export default DmChatPage;
