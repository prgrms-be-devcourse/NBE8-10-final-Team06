// src/pages/dm/DmChatPage.tsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Image as ImageIcon, Loader2 } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { useStomp } from '../../hooks/useStomp';
import type { SignupResponse } from '../../types/auth';
import { DmMessageResponse, MessageType, type DmMessageSliceResponse, type DmSendMessageRequest } from '../../types/dm';
import ProfileAvatar from '../../components/common/ProfileAvatar';
import { DmChatMessageRow } from '../../components/dm/DmChatMessageRow';
import { DmTypingBubbleRow } from '../../components/dm/DmTypingBubbleRow';
import {
  computeDmMessageIsMe,
  isDmTypingBubbleMine,
  isResolvedDmUserId,
  normalizeDmMessagesFromApi,
  toDmPositiveUserId,
} from '../../util/dmMessageDedupe';
import { mergeServerWithShareBackup, persistShareBackup, pruneShareBackupByServer } from '../../services/dmSharePersistence';
import { fetchDmFirstPageIfStillInRoom, fetchDmPollMergeIfStillInRoom } from '../../util/dmRoomServerReconcile';
import {
  buildDmStompMessageBody,
  dmStompAppJoin,
  dmStompAppLeave,
  dmStompAppMessage,
  dmStompAppRead,
  dmStompAppTyping,
} from '../../util/dmStompDestinations';
import { isRsSuccess } from '../../util/rsData';
import { mergePollSliceIntoMessages } from '../../util/dmMessagesMerge';
import { readJwtSubAsUserId } from '../../util/jwtUserId';
import { syncAuthTokensFromCookies } from '../../util/authStorageSync';
import DmRoomInfoModal from '../../components/dm/DmRoomInfoModal';
import { useDmRoomStomp } from '../../hooks/useDmRoomStomp';
import {
  DM_CLIENT_TYPING_START_REFRESH_MS,
  DM_CLIENT_TYPING_STOP_AFTER_IDLE_MS,
} from '../../util/dmTypingClient';
import { debugAgentLogA7f850 } from '../../util/debugAgentLogA7f850';

/**
 * 채팅창 REST 폴링(백업). 이전 400ms 고정은 네트워크 탭에 연속 요청처럼 보이고 부하가 커서,
 * STOMP 연결 시에는 긴 간격만 두고, WS 미연결 시에만 더 자주 맞춘다.
 */
const DM_POLL_INTERVAL_CONNECTED_MS = 12_000;
const DM_POLL_INTERVAL_DISCONNECTED_MS = 4_000;

/** /auth/me data.id 와 일부 환경의 userId 별칭 */
function readMeUserId(data: SignupResponse): number | null {
  const ext = data as SignupResponse & { userId?: unknown };
  const raw: unknown = ext.id ?? ext.userId;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const DmChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userId, setSessionUserId, nickname: myNickname, isLoggedIn } = useAuthStore();
  /** JWT sub + /auth/me 로 확정한 본인 id — 스토어 userId 오염·me 지연 시에도 말풍선·typing 이 맞게 */
  const [selfIdFromJwt, setSelfIdFromJwt] = useState<number | null>(() => readJwtSubAsUserId());
  /** `/auth/me` 의 숫자 id 만 별도 보관 — JWT sub 와 불일치해도 타이핑 에코·상대 추론에 서버 기준을 쓴다 */
  const [authMeNumericId, setAuthMeNumericId] = useState<number | null>(null);
  /** 양의 정수 확정 시에만 숫자, 미확정은 null (NaN 을 쓰지 않아 말풍선 폴백 꼬임 방지) */
  const effectiveSelfId = useMemo((): number | null => {
    const fromJwt = toDmPositiveUserId(selfIdFromJwt);
    if (fromJwt != null) return fromJwt;
    const fromToken = toDmPositiveUserId(readJwtSubAsUserId());
    if (fromToken != null) return fromToken;
    return toDmPositiveUserId(userId);
  }, [selfIdFromJwt, userId]);
  /**
   * STOMP 타이핑 에코 억제용 본인 id — 스토어 userId 는 제외(상대 id 로 오염되면 상대 typing 이 전부 막힘).
   * 순서: /auth/me → selfIdFromJwt → JWT sub
   */
  const selfIdForTypingEcho = useMemo((): number | null => {
    return (
      toDmPositiveUserId(authMeNumericId) ??
      toDmPositiveUserId(selfIdFromJwt) ??
      toDmPositiveUserId(readJwtSubAsUserId())
    );
  }, [authMeNumericId, selfIdFromJwt]);
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
    const selfIdOk = myUserIdNum != null;

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

  /** 메시지·타이핑 말풍선 공통 — `computeDmMessageIsMe` 의 마지막 senderId 비교에 사용 */
  const dmBubbleCtx = useMemo(
    () => ({
      isGroup: currentRoom?.isGroup ?? false,
      opponentUserId: headerPeer?.userId,
    }),
    [currentRoom?.isGroup, headerPeer?.userId]
  );

  const typingOpponentNickname = useMemo((): string | null => {
    if (!currentRoom || currentRoom.isGroup) return headerPeer?.nickname?.trim() ?? null;
    if (headerPeer?.nickname?.trim()) return headerPeer.nickname.trim();
    const selfGuess = selfIdForTypingEcho;
    const parts = currentRoom.participants;
    if (selfGuess != null) {
      const other = parts.find((p) => toDmPositiveUserId(p.userId) !== selfGuess);
      if (other?.nickname?.trim()) return other.nickname.trim();
    }
    return parts[0]?.nickname?.trim() ?? null;
  }, [currentRoom, headerPeer, selfIdForTypingEcho]);

  const [messages, setMessages] = useState<DmMessageResponse[]>([]);
  const [inputValue, setInputValue] = useState('');
  /** STOMP typing 이벤트 — 말풍선 좌우는 렌더 시 `senderId`(userId) 로 `computeDmMessageIsMe` 와 동일 규칙 적용 */
  const [remoteTyping, setRemoteTyping] = useState<{ userId: number; text: string } | null>(null);
  const [isMeTyping, setIsMeTyping] = useState(false);
  /**
   * 로컬 타이핑 중 본인 STOMP 에코만 숨김.
   * 타이핑 payload 의 userId 가 `/auth/me` 와 맞거나 JWT(`effectiveSelfId`) 와 맞는 경우가 있어 둘 다 에코 후보로 본다.
   */
  const showPeerTypingFromRemote = useMemo(() => {
    if (!remoteTyping) return false;
    if (!isMeTyping) return true;
    const remoteU = toDmPositiveUserId(remoteTyping.userId);
    if (remoteU == null) return true;
    const echoMe = toDmPositiveUserId(selfIdForTypingEcho);
    const jwtSelf = toDmPositiveUserId(myUserIdNum);
    if (echoMe != null && remoteU === echoMe) return false;
    if (jwtSelf != null && remoteU === jwtSelf) return false;
    return true;
  }, [remoteTyping, isMeTyping, myUserIdNum, selfIdForTypingEcho]);

  // #region agent log
  useEffect(() => {
    if (!remoteTyping) return;
    if (!showPeerTypingFromRemote) {
      debugAgentLogA7f850({
        runId: 'verify',
        hypothesisId: 'H-hidden',
        location: 'DmChatPage:remoteTypingFiltered',
        message: 'remoteTyping set but peer row hidden',
        data: {
          remoteUserId: remoteTyping.userId,
          selfIdForTypingEcho,
          myUserIdNum,
          isMeTyping,
        },
      });
    }
  }, [remoteTyping, showPeerTypingFromRemote, selfIdForTypingEcho, myUserIdNum, isMeTyping]);

  useEffect(() => {
    if (!showPeerTypingFromRemote || !remoteTyping) return;
    debugAgentLogA7f850({
      runId: 'h-ui',
      hypothesisId: 'H-ui',
      location: 'DmChatPage:showPeerTypingFromRemote',
      message: 'peer typing row visible',
      data: {
        remoteUserId: remoteTyping.userId,
        selfIdForTypingEcho,
        myUserIdNum,
        isMeTyping,
      },
    });
  }, [showPeerTypingFromRemote, remoteTyping, selfIdForTypingEcho, myUserIdNum, isMeTyping]);
  // #endregion

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
      setAuthMeNumericId(apiId);
      setSelfIdFromJwt((prev) => (prev === apiId ? prev : apiId));
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  /**
   * 상대 원격 타이핑이 켜지면 항상 맨 아래로(타이핑 행이 스크롤 밖에 남는 재현 방지).
   * 로컬 타이핑만 켜진 경우엔 하단 근처일 때만 스크롤.
   */
  useLayoutEffect(() => {
    if (!showPeerTypingFromRemote && !isMeTyping) return;
    const el = scrollRef.current;
    if (!el) return;
    /** 상대 타이핑 행은 목록 맨 아래에 붙으므로, 하단 근처 조건 없이 내려야 뷰에 들어옴(이전 100px 조건으로는 안 보이는 재현 가능). */
    if (showPeerTypingFromRemote) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const nearBottomPx = 100;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist <= nearBottomPx) el.scrollTop = el.scrollHeight;
  }, [showPeerTypingFromRemote, isMeTyping]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 서버로 `start` 를 보낸 세션 — 전송·방 이동 시 `stop` 필요 여부 판별 */
  const typingSessionActiveRef = useRef(false);
  /** 서버 TYPING_IDLE_MS(3s) 리셋용: 마지막 `start` 전송 시각 */
  const lastTypingStartSentAtRef = useRef(0);
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

  /** STOMP 타이핑 에코 억제 — 페이지에서 계산한 본인 id (me 우선) */
  const typingEchoSelfUserIdRef = useRef<number | null>(null);
  typingEchoSelfUserIdRef.current = selfIdForTypingEcho;
  /** STOMP 타이핑 말풍선 닉 폴백 — participants 에 typing user 가 없을 때 */
  const opponentTypingNicknameRef = useRef<string | null>(null);
  opponentTypingNicknameRef.current = typingOpponentNickname;

  /** 쿠키→localStorage 동기화 직후 토큰을 잡기 위해 몇 차례 리렌더 — useStomp reconnectKey 갱신 */
  const [stompTokenRescan, setStompTokenRescan] = useState(0);
  useEffect(() => {
    const timeouts = [0, 120, 400].map((ms) =>
      window.setTimeout(() => {
        setStompTokenRescan((n) => n + 1);
      }, ms)
    );
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, []);

  const stompReconnectKey = useMemo(() => {
    syncAuthTokensFromCookies();
    const t = (localStorage.getItem('accessToken') ?? '').trim();
    const tail = t.length > 12 ? t.slice(-16) : t;
    return `${isLoggedIn ? 1 : 0}:${userId ?? ''}:${tail}`;
  }, [isLoggedIn, userId, stompTokenRescan]);

  const { isConnected, subscribe, publish } = useStomp({
    endpoint: '/ws',
    reconnectKey: stompReconnectKey,
  });

  const mergeFreshSliceIntoMessages = useCallback((rid: number, slice: DmMessageSliceResponse) => {
    const normalized = normalizeDmMessagesFromApi(slice.messages ?? []);
    pruneShareBackupByServer(rid, normalized);
    const chronological = [...normalized].reverse();
    const merged = mergeServerWithShareBackup(rid, chronological);
    // mergePollSliceIntoMessages: REST 첫 페이지에 아직 없는 STOMP 실시간 메시지·스크롤로 불러온 과거 id 를 유지
    // (이전 mergeServerMessagesWithOptimistic 은 낙관적 메시지가 없을 때 목록 전체를 slice 로 덮어 상대 메시지가 증발함)
    setMessages((prev) => mergePollSliceIntoMessages(prev, merged));
    setNextCursor(slice.nextCursor);
    setHasNext(slice.hasNext);
  }, []);

  const sendReadEvent = useCallback(
    (messageId: number) => {
      const actor = effectiveSelfIdRef.current;
      const ridStr = roomId;
      if (!isConnected || messageId <= 0 || !isResolvedDmUserId(actor) || !ridStr) return;
      const rid = Number(ridStr);
      publish(dmStompAppRead(rid), { roomId: rid, userId: actor, messageId });
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
      setAuthMeNumericId(apiId);
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

  const prevRoomIdStrForTypingRef = useRef<string | undefined>(undefined);
  // `roomId` 가 바뀔 때만 이전 방에 typing stop + 로컬 타이머 정리 (`isConnected` 변화만으로는 초기화하지 않음)
  useEffect(() => {
    const was = prevRoomIdStrForTypingRef.current;
    const roomChanged = was !== undefined && was !== roomId;

    if (roomChanged && roomId) {
      const prevNum = Number(was);
      const actor = effectiveSelfIdRef.current;
      if (
        isConnected &&
        Number.isFinite(prevNum) &&
        isResolvedDmUserId(actor) &&
        typingSessionActiveRef.current
      ) {
        publish(dmStompAppTyping(prevNum), { roomId: prevNum, userId: actor, status: 'stop' });
      }
    }

    if (roomChanged) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      typingSessionActiveRef.current = false;
      lastTypingStartSentAtRef.current = 0;
      setIsMeTyping(false);
    }

    prevRoomIdStrForTypingRef.current = roomId;
  }, [roomId, isConnected, publish]);

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

  // STOMP 실시간이 누락돼도 REST로 동기화(저빈도 백업). 백그라운드 탭에서는 요청 생략, 포그라운드 복귀 시 1회 동기화.
  useEffect(() => {
    if (!roomId) return;
    const rid = Number(roomId);
    const intervalMs = isConnected ? DM_POLL_INTERVAL_CONNECTED_MS : DM_POLL_INTERVAL_DISCONNECTED_MS;

    const tick = () => {
      if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchDmPollMergeIfStillInRoom(rid, roomIdRef, setMessages, {
        beforeMerge: (r, normalized) => pruneShareBackupByServer(r, normalized),
        afterMerge: (incoming) => {
          if (incoming.length > 0) setIsLoading(false);
        },
      });
    };

    tick();
    const intervalId = window.setInterval(tick, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [roomId, isConnected]);

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

  /**
   * STOMP `/topic/dm.{roomId}` 구독·토픽 이벤트 처리·대기 전송 플러시.
   * 서버는 CONNECT JWT 를 세션에 묶고 SEND 마다 SecurityContext 를 복원하므로 message/read 가 실시간으로 맞는다.
   */
  useDmRoomStomp({
    roomId,
    isConnected,
    subscribe,
    publish,
    effectiveSelfIdRef,
    typingEchoSelfUserIdRef,
    roomIdRef,
    typingPollDebounceRef,
    scrollRef,
    messagesRefreshGenRef,
    sendReadEventRef,
    mergeFreshSliceIntoMessages,
    setMessages,
    setIsLoading,
    setRemoteTyping,
    setLastReadIdByOpponent,
    opponentTypingNicknameRef,
    typingSessionActiveRef,
  });

  /** 입장/퇴장은 본인 id 가 있을 때만 송신 (구독과 분리) */
  useEffect(() => {
    if (!isConnected || !roomId) return;
    const rid = Number(roomId);
    const actorId = effectiveSelfIdRef.current;
    if (!isResolvedDmUserId(actorId)) return;

    publish(dmStompAppJoin(rid), { roomId: rid, userId: actorId });

    return () => {
      const leaveId = effectiveSelfIdRef.current;
      if (isResolvedDmUserId(leaveId)) {
        publish(dmStompAppLeave(rid), { roomId: rid, userId: leaveId });
      }
    };
  }, [isConnected, roomId, effectiveSelfId, publish]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const actor = effectiveSelfIdRef.current;
    if (!isResolvedDmUserId(actor)) {
      console.error('[DM] handleSendMessage: 본인 userId 를 확정할 수 없어 전송하지 않습니다.', {
        effectiveSelfIdRef: effectiveSelfIdRef.current,
        effectiveSelfId,
      });
      alert('로그인 사용자 정보를 확인할 수 없습니다. 잠시 후 다시 시도하거나 다시 로그인해 주세요.');
      return;
    }
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
    const sendPl: DmSendMessageRequest = { type: 'TEXT', content, thumbnail: null };
    persistShareBackup(rid, actor, [sendPl]);
    const destination = dmStompAppMessage(rid);
    const stompBody = buildDmStompMessageBody(sendPl);
    publish(destination, stompBody);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingSessionActiveRef.current && isResolvedDmUserId(actor)) {
      publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
      console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'message_sent' });
      typingSessionActiveRef.current = false;
      lastTypingStartSentAtRef.current = 0;
    }
    setIsMeTyping(false);
    /** STOMP `message` 수신이 1차 동기화 — 한 번 REST 로 낙관적 id·서버 스냅샷 정합만 맞춘다 */
    window.setTimeout(() => {
      fetchDmFirstPageIfStillInRoom(rid, roomIdRef, (slice) => mergeFreshSliceIntoMessages(rid, slice));
    }, 700);
    // 하단 이동
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    const actor = effectiveSelfIdRef.current;
    const rid = roomId != null ? Number(roomId) : NaN;
    if (!Number.isFinite(rid) || !isResolvedDmUserId(actor)) return;

    if (nextVal.trim() === '') {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingSessionActiveRef.current) {
        publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
        console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'input_cleared' });
        typingSessionActiveRef.current = false;
        lastTypingStartSentAtRef.current = 0;
      }
      setIsMeTyping(false);
      return;
    }

    const typingDest = dmStompAppTyping(rid);
    const typingBody = { roomId: rid, userId: actor, status: 'start' as const };
    const now = Date.now();

    if (!isMeTyping) {
      setIsMeTyping(true);
      publish(typingDest, typingBody);
      console.log('[DM typing][send_start]', { roomId: rid, userId: actor, reason: 'first_keystroke' });
      typingSessionActiveRef.current = true;
      lastTypingStartSentAtRef.current = now;
    } else if (
      typingSessionActiveRef.current &&
      now - lastTypingStartSentAtRef.current >= DM_CLIENT_TYPING_START_REFRESH_MS
    ) {
      // 백엔드는 마지막 start 기준 3초 후 자동 stop — 연속 입력 중에도 주기적으로 start 로 타이머 리셋
      publish(typingDest, typingBody);
      console.log('[DM typing][send_start]', { roomId: rid, userId: actor, reason: 'keepalive' });
      lastTypingStartSentAtRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsMeTyping(false);
      if (typingSessionActiveRef.current) {
        publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
        console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'idle_timeout' });
        typingSessionActiveRef.current = false;
        lastTypingStartSentAtRef.current = 0;
      }
      typingTimeoutRef.current = null;
    }, DM_CLIENT_TYPING_STOP_AFTER_IDLE_MS);
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

      <main
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 상단 무한 스크롤 관찰 포인트 */}
        <div ref={topObserverRef} style={{ height: '10px' }} />
        {isFetchingMore && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}><Loader2 className="animate-spin" size={20} color="#8e8e8e" /></div>}

        {isLoading && messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8e8e8e', marginTop: '20px' }}>로드 중...</p>
        ) : (
          messages.map((msg, idx) => (
            <DmChatMessageRow
              key={msg.id < 0 ? `tmp-${msg.id}-${idx}` : msg.id}
              msg={msg}
              isMe={computeDmMessageIsMe(msg, myUserIdNum, dmBubbleCtx)}
              showReadStatus={msg.id > 0 && msg.id <= lastReadIdByOpponent}
            />
          ))
        )}

        {/* 원격 타이핑: `showPeerTypingFromRemote` 가 켜진 경우만 렌더하므로 항상 상대 말풍선(왼쪽·회색). isDmTypingBubbleMine 은 본인 id 미확정 시 1:1 추론에서 오판할 수 있음. */}
        {showPeerTypingFromRemote && remoteTyping ? (
          <DmTypingBubbleRow text={remoteTyping.text} isMe={false} />
        ) : null}
        {isMeTyping && isResolvedDmUserId(myUserIdNum) ? (
          <DmTypingBubbleRow
            text="입력 중..."
            isMe={isDmTypingBubbleMine(myUserIdNum, myUserIdNum, dmBubbleCtx)}
          />
        ) : null}
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
