// src/pages/dm/DmChatPage.tsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Info, Image as ImageIcon, Loader2 } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { useStomp } from '../../hooks/useStomp';
import type { AuthMeResponse } from '../../types/auth';
import {
  DmMessageResponse,
  MessageType,
  type DmMessageSliceResponse,
  type DmRoomParticipantSummary,
  type DmSendMessageRequest,
} from '../../types/dm';
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
import {
  mergeServerWithShareBackup,
  persistShareBackup,
  pruneShareBackupByServer,
} from '../../services/dmSharePersistence';
import { fetchDmPollMergeIfStillInRoom } from '../../util/dmRoomServerReconcile';
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
import { resolveSockJsStompUrl } from '../../util/stompSockJsUrl';
import DmRoomInfoModal from '../../components/dm/DmRoomInfoModal';
import { useDmRoomTopic } from '../../hooks/useDmRoomTopic';
import {
  DM_CLIENT_TYPING_START_REFRESH_MS,
  DM_CLIENT_TYPING_STOP_AFTER_IDLE_MS,
} from '../../util/dmTypingClient';
import { formatDmPeerNickname } from '../../util/dmPeerDisplayName';
import { scrollDmChatPaneToBottom } from '../../util/dmScroll';

/**
 * 채팅창 REST 동기화: 백엔드는 DM 전송을 STOMP 만 제공하므로, WS `message` 프레임이 누락돼도
 * DB 와 맞추기 위해 방 안·탭이 보일 때 짧은 간격으로 첫 페이지를 병합한다.
 */
const DM_POLL_INTERVAL_IN_ROOM_MS = 2_500;
const DM_POLL_INTERVAL_IN_ROOM_DISCONNECTED_MS = 2_000;
/** 맨 아래에서 이만큼 이상 떨어지면 “아래로” 버튼 표시 */
const DM_SCROLL_JUMP_BUTTON_THRESHOLD_PX = 120;

/** /auth/me(MyInfoResponse) data.id 와 일부 환경의 userId 별칭 */
function readMeUserId(data: AuthMeResponse & { userId?: unknown }): number | null {
  const raw: unknown = data.id ?? data.userId;
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
  /**
   * REST 메시지 `senderId` 는 DB user id 기준이 많아 `/auth/me` 와 맞추는 편이 안전함.
   * JWT·스토어만 앞세운 `effectiveSelfId` 와 어긋나면 상대 말풍선이 전부 내 쪽으로 갈 수 있음.
   */
  const bubbleSelfUserId = useMemo(
    (): number | null => selfIdForTypingEcho ?? effectiveSelfId,
    [selfIdForTypingEcho, effectiveSelfId]
  );
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
    const selfForPeer = bubbleSelfUserId ?? myUserIdNum;
    const selfIdOk = selfForPeer != null;

    const notSelfByNick = (p: (typeof parts)[0]) => {
      const pn = p.nickname?.trim().toLowerCase() ?? '';
      return !myNickNorm || pn === '' || pn !== myNickNorm;
    };

    if (parts.length === 1) {
      const only = parts[0];
      if (!only) return null;
      if (selfIdOk && Number(only.userId) === selfForPeer) return null;
      if (myNickNorm && only.nickname?.trim().toLowerCase() === myNickNorm) return null;
      return only;
    }

    if (selfIdOk) {
      const byId = parts.find((p) => Number(p.userId) !== selfForPeer);
      if (byId) return byId;
    }
    const byNick = parts.find(notSelfByNick);
    return byNick ?? parts[0] ?? null;
  }, [currentRoom, myUserIdNum, myNickNorm, bubbleSelfUserId]);

  const headerTitle = useMemo(() => {
    if (!currentRoom) return '채팅방';
    if (currentRoom.isGroup) return currentRoom.roomName || '그룹 채팅';
    // 1:1: roomName 은 DB에 상대 닉으로 고정돼 있지 않을 수 있어(본인 닉으로 보이는 경우) 쓰지 않음
    if (headerPeer) return formatDmPeerNickname(headerPeer.nickname);
    return '채팅';
  }, [currentRoom, headerPeer]);

  /**
   * 1:1 말풍선용 상대 id — `headerPeer` 가 닉 폴백 등으로 틀릴 수 있어 participants 중 본인이 아닌 사람이 정확히 한 명이면 그 id 를 쓴다.
   */
  const dmBubbleOpponentUserId = useMemo((): number | null => {
    if (!currentRoom || currentRoom.isGroup) {
      return toDmPositiveUserId(headerPeer?.userId);
    }
    const selfGuess = bubbleSelfUserId ?? myUserIdNum;
    if (selfGuess == null) return toDmPositiveUserId(headerPeer?.userId);
    const others = currentRoom.participants.filter((p) => {
      const pid = toDmPositiveUserId(p.userId);
      return pid != null && pid !== selfGuess;
    });
    if (others.length === 1) return toDmPositiveUserId(others[0].userId);
    return toDmPositiveUserId(headerPeer?.userId);
  }, [currentRoom, headerPeer?.userId, bubbleSelfUserId, myUserIdNum]);

  /** 메시지·타이핑 말풍선 공통 — 1:1 에서 `opponentUserId` 는 상대 확정용(회색 말풍선 우선) */
  const dmBubbleCtx = useMemo(
    () => ({
      isGroup: currentRoom?.isGroup ?? false,
      opponentUserId: dmBubbleOpponentUserId,
    }),
    [currentRoom?.isGroup, dmBubbleOpponentUserId]
  );

  const participantByUserId = useMemo(() => {
    const m = new Map<number, DmRoomParticipantSummary>();
    if (!currentRoom?.participants?.length) return m;
    for (const p of currentRoom.participants) {
      const id = toDmPositiveUserId(p.userId);
      if (id != null) m.set(id, p);
    }
    return m;
  }, [currentRoom]);

  const resolvePeerProfileForMessage = useCallback(
    (isMe: boolean, senderId: number): DmRoomParticipantSummary | null => {
      if (isMe) return null;
      const sid = toDmPositiveUserId(senderId);
      if (sid != null) {
        const fromMap = participantByUserId.get(sid);
        if (fromMap) return fromMap;
      }
      if (!currentRoom?.isGroup && headerPeer) {
        const hpId = toDmPositiveUserId(headerPeer.userId);
        if (hpId != null && sid != null && hpId === sid) return headerPeer;
      }
      return headerPeer;
    },
    [currentRoom?.isGroup, headerPeer, participantByUserId]
  );

  const typingOpponentNickname = useMemo((): string | null => {
    if (!currentRoom || currentRoom.isGroup) {
      const n = headerPeer?.nickname?.trim();
      return n && n.length > 0 ? n : null;
    }
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
  /** `handleInputChange`/`applyTypingForInputValue` 에서 stale closure 없이 타이핑 세션 판별 */
  const isMeTypingRef = useRef(false);
  isMeTypingRef.current = isMeTyping;
  /**
   * 로컬 타이핑 중 본인 STOMP 에코만 숨김.
   * 타이핑 payload 의 userId 가 `/auth/me` 와 맞거나 JWT(`effectiveSelfId`) 와 맞는 경우가 있어 둘 다 에코 후보로 본다.
   */
  const showPeerTypingFromRemote = useMemo(() => {
    if (!remoteTyping) return false;

    const remoteU = toDmPositiveUserId(remoteTyping.userId);
    if (remoteU == null) return true;

    const echoMe = toDmPositiveUserId(selfIdForTypingEcho);
    const jwtSelf = toDmPositiveUserId(bubbleSelfUserId);
    if (echoMe != null && remoteU === echoMe) return false;
    if (jwtSelf != null && remoteU === jwtSelf) return false;

    return true;
  }, [remoteTyping, bubbleSelfUserId, selfIdForTypingEcho]);

  const remoteTypingPeerProfile = useMemo((): DmRoomParticipantSummary | null => {
    if (!remoteTyping) return null;
    const uid = toDmPositiveUserId(remoteTyping.userId);
    if (uid == null) return headerPeer;
    if (currentRoom?.isGroup) {
      return participantByUserId.get(uid) ?? null;
    }
    return headerPeer;
  }, [remoteTyping, currentRoom?.isGroup, headerPeer, participantByUserId]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [lastReadIdByOpponent, setLastReadIdByOpponent] = useState<number>(0);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

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
  /** 맨 아래 메시지가 바뀔 때만 스크롤(위쪽 과거 로드 시 마지막 id 동일 → 스크롤 유지) */
  const dmScrollLastTailKeyRef = useRef<string | null>(null);
  useEffect(() => {
    dmScrollLastTailKeyRef.current = null;
    setShowJumpToBottom(false);
  }, [roomId]);

  const updateJumpButtonVisibility = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToBottom(distFromBottom > DM_SCROLL_JUMP_BUTTON_THRESHOLD_PX);
  }, []);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const key = `${last.id}\0${last.createdAt ?? ''}`;
    if (dmScrollLastTailKeyRef.current === key) return;
    dmScrollLastTailKeyRef.current = key;
    scrollDmChatPaneToBottom(scrollRef.current);
    requestAnimationFrame(() => updateJumpButtonVisibility());
  }, [messages, updateJumpButtonVisibility]);

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
      requestAnimationFrame(() => updateJumpButtonVisibility());
      return;
    }
    const nearBottomPx = 100;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist <= nearBottomPx) {
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => updateJumpButtonVisibility());
    }
  }, [showPeerTypingFromRemote, isMeTyping, updateJumpButtonVisibility]);
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

  /**
   * STOMP·낙관적 전송·read 의 `userId`/`senderId` — REST `senderId`·말풍선과 같은 축이 되도록 `/auth/me` 우선 id(`bubbleSelfUserId`)를 쓴다.
   * JWT/스토어만 쓰면 서버 숫자 id 와 어긋나 상대 메시지가 전부 내 말풍선으로 보일 수 있음.
   */
  const effectiveSelfIdRef = useRef<number | null>(bubbleSelfUserId);
  effectiveSelfIdRef.current = bubbleSelfUserId;

  /** STOMP 타이핑 에코 억제 — 페이지에서 계산한 본인 id (me 우선) */
  const typingEchoSelfUserIdRef = useRef<number | null>(null);
  typingEchoSelfUserIdRef.current = selfIdForTypingEcho;
  /** STOMP 타이핑 말풍선 닉 폴백 — participants 에 typing user 가 없을 때 */
  const opponentTypingNicknameRef = useRef<string | null>(null);
  opponentTypingNicknameRef.current = typingOpponentNickname;

  /**
   * STOMP reconnectKey 를 짧은 간격으로 여러 번 바꾸면 SockJS 가 연결 도중 `deactivate` 로 끊기며
   * "WebSocket is closed before the connection is established" 가 반복되고, cleanup 시 대기 publish 가 버려져
   * 메시지가 DB 에 저장되지 않을 수 있다. 쿠키→localStorage 반영은 1회만 검사한다.
   */
  const [stompAuthRevision, setStompAuthRevision] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const before = (localStorage.getItem('accessToken') ?? '').trim();
      syncAuthTokensFromCookies();
      const after = (localStorage.getItem('accessToken') ?? '').trim();
      if (after !== before) {
        setStompAuthRevision((n) => n + 1);
      }
    }, 280);
    return () => window.clearTimeout(id);
  }, [isLoggedIn, userId]);

  const stompReconnectKey = useMemo(() => {
    syncAuthTokensFromCookies();
    const t = (localStorage.getItem('accessToken') ?? '').trim();
    const tail = t.length > 12 ? t.slice(-16) : t;
    return `${isLoggedIn ? 1 : 0}:${userId ?? ''}:${tail}:r${stompAuthRevision}`;
  }, [isLoggedIn, userId, stompAuthRevision]);

  /** 개발 시 Vite 프록시 대신 백엔드 직접 연결 — SockJS WebSocket 조기 종료 완화 */
  const stompSockJsUrl = useMemo(() => resolveSockJsStompUrl('/ws'), []);

  const { isConnected, subscribe, publish } = useStomp({
    endpoint: stompSockJsUrl,
    reconnectKey: stompReconnectKey,
  });

  const applyTypingForInputValue = useCallback(
    (nextVal: string) => {
      const actor = effectiveSelfIdRef.current;
      const rid = roomId != null ? Number(roomId) : NaN;
      if (!Number.isFinite(rid) || !isResolvedDmUserId(actor)) return;

      if (nextVal.trim() === '') {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        const hadTypingSession = typingSessionActiveRef.current || isMeTypingRef.current;
        /** 에코가 `publish(stop)` 직전에 처리되면 `typingSessionActiveRef` 가 true 로 남아 자기 stop 이 무시될 수 있음 */
        typingSessionActiveRef.current = false;
        lastTypingStartSentAtRef.current = 0;
        publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
        setRemoteTyping((prev) => {
          if (prev == null) return prev;
          const prevUid = toDmPositiveUserId(prev.userId);
          const selfUid = toDmPositiveUserId(actor);
          return selfUid != null && prevUid === selfUid ? null : prev;
        });
        if (hadTypingSession) {
          console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'input_cleared' });
        }
        setIsMeTyping(false);
        return;
      }

      const typingDest = dmStompAppTyping(rid);
      const typingBody = { roomId: rid, userId: actor, status: 'start' as const };
      const now = Date.now();

      if (!isMeTypingRef.current) {
        setIsMeTyping(true);
        publish(typingDest, typingBody);
        console.log('[DM typing][send_start]', { roomId: rid, userId: actor, reason: 'first_keystroke' });
        typingSessionActiveRef.current = true;
        lastTypingStartSentAtRef.current = now;
      } else if (
        typingSessionActiveRef.current &&
        now - lastTypingStartSentAtRef.current >= DM_CLIENT_TYPING_START_REFRESH_MS
      ) {
        publish(typingDest, typingBody);
        console.log('[DM typing][send_start]', { roomId: rid, userId: actor, reason: 'keepalive' });
        lastTypingStartSentAtRef.current = now;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsMeTyping(false);
        if (typingSessionActiveRef.current) {
          typingSessionActiveRef.current = false;
          lastTypingStartSentAtRef.current = 0;
          publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
          console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'idle_timeout' });
        }
        typingTimeoutRef.current = null;
      }, DM_CLIENT_TYPING_STOP_AFTER_IDLE_MS);
    },
    [roomId, publish]
  );

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
        typingSessionActiveRef.current = false;
        lastTypingStartSentAtRef.current = 0;
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

  // STOMP `message` 가 오지 않아도 getMessages 첫 페이지로 상대/본인 메시지를 맞춘다.
  useEffect(() => {
    if (!roomId) return;
    const rid = Number(roomId);
    const intervalMs = isConnected
      ? DM_POLL_INTERVAL_IN_ROOM_MS
      : DM_POLL_INTERVAL_IN_ROOM_DISCONNECTED_MS;

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

  /** 토픽 한 구독: 메시지·read·타이핑·대기 배치 플러시 (백엔드 DmWebSocketController 명세). */
  useDmRoomTopic({
    roomId,
    isConnected,
    subscribe,
    publish,
    effectiveSelfIdRef,
    typingEchoSelfUserIdRef,
    roomIdRef,
    typingPollDebounceRef,
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
  }, [isConnected, roomId, effectiveSelfId, bubbleSelfUserId, publish]);

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

    const restSyncAfterSend = () => {
      fetchDmPollMergeIfStillInRoom(rid, roomIdRef, setMessages, {
        beforeMerge: (r, normalized) => pruneShareBackupByServer(r, normalized),
        afterMerge: (incoming) => {
          if (incoming.length > 0) setIsLoading(false);
        },
      });
    };
    window.setTimeout(restSyncAfterSend, 350);
    window.setTimeout(restSyncAfterSend, 1_600);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingSessionActiveRef.current && isResolvedDmUserId(actor)) {
      typingSessionActiveRef.current = false;
      lastTypingStartSentAtRef.current = 0;
      publish(dmStompAppTyping(rid), { roomId: rid, userId: actor, status: 'stop' });
      console.log('[DM typing][send_stop]', { roomId: rid, userId: actor, reason: 'message_sent' });
    }
    setIsMeTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    const native = e.nativeEvent as InputEvent;
    if (native.isComposing) return;
    applyTypingForInputValue(nextVal);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    applyTypingForInputValue(v);
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
    <div
      className="app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#fff',
        borderLeft: '1px solid #dbdbdb',
        borderRight: '1px solid #dbdbdb',
      }}
    >
      <header style={{ height: '60px', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', backgroundColor: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/dm')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={24} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#efefef',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {headerPeer ? (
                <ProfileAvatar
                  fillContainer
                  authorUserId={headerPeer.userId}
                  profileImageUrl={headerPeer.profileImageUrl}
                  nickname={formatDmPeerNickname(headerPeer.nickname)}
                />
              ) : (
                <ImageIcon size={20} color="#8e8e8e" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <main
          ref={scrollRef}
          onScroll={updateJumpButtonVisibility}
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
          messages.map((msg, idx) => {
            const isMe = computeDmMessageIsMe(msg, bubbleSelfUserId, dmBubbleCtx);
            const peer = resolvePeerProfileForMessage(isMe, msg.senderId);
            const peerSenderLabel =
              !isMe
                ? currentRoom?.isGroup
                  ? formatDmPeerNickname(participantByUserId.get(Number(msg.senderId))?.nickname)
                  : formatDmPeerNickname(
                      peer?.nickname ?? participantByUserId.get(Number(msg.senderId))?.nickname,
                    )
                : null;
            return (
              <DmChatMessageRow
                key={msg.id < 0 ? `tmp-${msg.id}-${idx}` : msg.id}
                msg={msg}
                isMe={isMe}
                showReadStatus={msg.id > 0 && msg.id <= lastReadIdByOpponent}
                senderLabel={peerSenderLabel}
                peerProfile={
                  peer
                    ? {
                        userId: peer.userId,
                        nickname: formatDmPeerNickname(peer.nickname),
                        profileImageUrl: peer.profileImageUrl,
                      }
                    : null
                }
              />
            );
          })
        )}

        {/* 원격 타이핑: `showPeerTypingFromRemote` 가 켜진 경우만 렌더하므로 항상 상대 말풍선(왼쪽·회색). isDmTypingBubbleMine 은 본인 id 미확정 시 1:1 추론에서 오판할 수 있음. */}
        {showPeerTypingFromRemote && remoteTyping ? (
          <DmTypingBubbleRow
            text={remoteTyping.text}
            isMe={false}
            peerProfile={
              remoteTypingPeerProfile
                ? {
                    userId: remoteTypingPeerProfile.userId,
                    nickname: formatDmPeerNickname(remoteTypingPeerProfile.nickname),
                    profileImageUrl: remoteTypingPeerProfile.profileImageUrl,
                  }
                : null
            }
          />
        ) : null}
        {isMeTyping && isResolvedDmUserId(bubbleSelfUserId) ? (
          <DmTypingBubbleRow
            text="입력 중..."
            isMe={isDmTypingBubbleMine(bubbleSelfUserId, bubbleSelfUserId, dmBubbleCtx)}
          />
        ) : null}
        </main>

        {showJumpToBottom ? (
          <button
            type="button"
            aria-label="맨 아래로 이동"
            onClick={() => {
              scrollDmChatPaneToBottom(scrollRef.current);
              requestAnimationFrame(() => updateJumpButtonVisibility());
            }}
            style={{
              position: 'absolute',
              right: 18,
              bottom: 14,
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1px solid #dbdbdb',
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#262626',
              zIndex: 5,
            }}
          >
            <ChevronDown size={22} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      <footer style={{ padding: '20px' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbdbdb', borderRadius: '30px', padding: '10px 20px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onCompositionEnd={handleCompositionEnd}
            placeholder="메시지 입력..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem' }}
          />
          <button type="submit" disabled={!inputValue.trim()} style={{ background: 'none', border: 'none', color: inputValue.trim() ? '#0095f6' : '#b2dffc', fontWeight: 'bold', fontSize: '1rem' }}>보내기</button>
        </form>
      </footer>

      <DmRoomInfoModal open={showRoomInfo} onClose={() => setShowRoomInfo(false)} room={currentRoom ?? null} />
    </div>
  );
};

export default DmChatPage;
