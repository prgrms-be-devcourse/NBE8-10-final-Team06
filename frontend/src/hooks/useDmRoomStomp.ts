import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { IMessage } from '@stomp/stompjs';
import { useDmStore } from '../store/useDmStore';
import { takePendingDmBatch } from '../services/dmPendingSend';
import { persistShareBackup, pruneShareBackupByServer } from '../services/dmSharePersistence';
import type { DmMessageResponse, DmMessageSliceResponse, DmSendMessageRequest, MessageType } from '../types/dm';
import type { WebSocketEventPayload } from '../types/dm';
import {
  dmMessageDedupeKey,
  isResolvedDmUserId,
  toDmPositiveUserId,
} from '../util/dmMessageDedupe';
import { readJwtSubAsUserId } from '../util/jwtUserId';
import { fetchDmFirstPageIfStillInRoom, fetchDmPollMergeIfStillInRoom, type DmRoomIdRef } from '../util/dmRoomServerReconcile';
import {
  buildDmStompMessageBody,
  dmStompAppMessage,
  dmStompTopic,
} from '../util/dmStompDestinations';
import {
  extractDmMessageFromStompBody,
  getReadMessageIdFromDmEvent,
  getTypingFieldsFromDmEvent,
  coerceStompTopicEventRecord,
  parseDmMessagePayload,
  parseDmWebSocketJson,
  parseWrappedDmMessageEvent,
  resolveDmTopicEventKind,
  stompMessageBodyToString,
} from '../util/dmWebSocketPayload';
import { parseAllInboundDmTypingEvents } from '../util/dmTypingInbound';
import { debugAgentLogA7f850 } from '../util/debugAgentLogA7f850';

function toOptimisticDmMessages(batch: DmSendMessageRequest[], sender: number): DmMessageResponse[] {
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
}

export type UseDmRoomStompParams = {
  roomId: string | undefined;
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => { unsubscribe: () => void } | undefined;
  publish: (destination: string, body: unknown) => void;
  effectiveSelfIdRef: MutableRefObject<number | null>;
  /** DmChatPage `selfIdForTypingEcho` — /auth/me 숫자 id 우선(JWT sub 와 다를 수 있음) */
  typingEchoSelfUserIdRef: MutableRefObject<number | null>;
  roomIdRef: DmRoomIdRef;
  typingPollDebounceRef: MutableRefObject<number | null>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  messagesRefreshGenRef: MutableRefObject<number>;
  sendReadEventRef: MutableRefObject<(messageId: number) => void>;
  mergeFreshSliceIntoMessages: (rid: number, slice: DmMessageSliceResponse) => void;
  setMessages: Dispatch<SetStateAction<DmMessageResponse[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setRemoteTyping: Dispatch<SetStateAction<{ userId: number; text: string } | null>>;
  setLastReadIdByOpponent: Dispatch<SetStateAction<number>>;
  /** 그룹 닉·1:1 폴백 — participants 에 typing user 가 없을 때 말풍선 문구용 */
  opponentTypingNicknameRef: MutableRefObject<string | null>;
  /** 이 탭에서 STOMP 로 typing start 를 보낸 세션 — 본인 userId 에코도 타 탭·상대 타이핑과 구분 */
  typingSessionActiveRef: MutableRefObject<boolean>;
};

/**
 * DM 방 `/topic/dm.{roomId}` 구독, 대기 중 로컬 배치 플러시, 입장 직후 짧은 REST 동기화.
 */
export function useDmRoomStomp(p: UseDmRoomStompParams): void {
  const {
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
  } = p;

  /**
   * STOMP 콜백·merge 를 ref 로 두고 effect deps 는 `isConnected`·`roomId` 만 둔다.
   * 그렇지 않으면 부모 리렌더마다 구독이 해제→재구독되며(이전 로그의 연속 cleanup) 타이핑 표시가 사라짐.
   */
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const mergeFreshRef = useRef(mergeFreshSliceIntoMessages);
  mergeFreshRef.current = mergeFreshSliceIntoMessages;

  /** 상대 입력 중 말풍선에 대응하는 userId — stop 은 이 사용자 것일 때만 UI 제거 */
  const lastShownTypingUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isConnected || !roomId) {
      return () => {};
    }
    const rid = Number(roomId);

    /**
     * 브로커/클라이언트가 같은 짧은 구간에 stop → start 를 내면 즉시 `setRemoteTyping(null)` 만 하면 입력 중이 안 보이는 것처럼 보일 수 있음.
     * stop 은 약간 지연 후 적용하고, 그 전에 오는 start 는 타이머를 취소한다.
     */
    const TYPING_STOP_UI_DEBOUNCE_MS = 220;
    const typingStopUiDebounceRef = { current: null as number | null };
    const cancelTypingStopDebounce = () => {
      if (typingStopUiDebounceRef.current != null) {
        window.clearTimeout(typingStopUiDebounceRef.current);
        typingStopUiDebounceRef.current = null;
      }
    };
    const clearRemoteTypingNow = () => {
      cancelTypingStopDebounce();
      lastShownTypingUserIdRef.current = null;
      setRemoteTyping(null);
    };

    const flushTimer = window.setTimeout(() => {
      const actorId = effectiveSelfIdRef.current;
      if (!isResolvedDmUserId(actorId)) return;

      const batch = takePendingDmBatch(rid);
      if (!batch?.length) return;

      persistShareBackup(rid, actorId, batch);

      setIsLoading(false);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id >= 0);
        return [...withoutTemp, ...toOptimisticDmMessages(batch, actorId)];
      });

      const dest = dmStompAppMessage(rid);
      batch.forEach((pl) => {
        const body = buildDmStompMessageBody(pl);
        publishRef.current(dest, body);
      });

      messagesRefreshGenRef.current += 1;
      const gen = messagesRefreshGenRef.current;
      window.setTimeout(() => {
        fetchDmFirstPageIfStillInRoom(rid, roomIdRef, (slice) => mergeFreshRef.current(rid, slice), {
          abortIf: () => gen !== messagesRefreshGenRef.current,
          onNormalized: (normalized) => {
            if (gen !== messagesRefreshGenRef.current) return;
            if (normalized.length > 0) {
              sendReadEventRef.current(normalized[0].id);
            }
          },
        });
      }, 700);

      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }, 450);

    const applyTopicTyping = (t: { userId: number; status: 'start' | 'stop' }) => {
      const typingUid = Number(t.userId);
      if (!Number.isFinite(typingUid) || typingUid <= 0) return;

      const roomSnap = useDmStore.getState().rooms.find((r) => Number(r.roomId) === rid);
      const selfFromPage = toDmPositiveUserId(typingEchoSelfUserIdRef.current);
      const selfJwt = toDmPositiveUserId(readJwtSubAsUserId());
      /** 스토어 기반 effectiveSelfId 는 넣지 않음 — 오염 시 상대 userId 와 같아져 typing start 가 무시됨 */
      const echoSuppressId = selfFromPage ?? selfJwt;

      const parts = roomSnap?.participants ?? [];

      const runTypingPollDebounced = () => {
        if (t.status !== 'start') return;
        if (typingPollDebounceRef.current) window.clearTimeout(typingPollDebounceRef.current);
        typingPollDebounceRef.current = window.setTimeout(() => {
          typingPollDebounceRef.current = null;
          fetchDmPollMergeIfStillInRoom(rid, roomIdRef, setMessages, {
            beforeMerge: (r, normalized) => pruneShareBackupByServer(r, normalized),
          });
        }, 280);
      };

      if (t.status === 'stop') {
        // 본인 stop 에코: 이 탭이 방금 타이핑 중이었을 때만 무시(로컬 입력 말풍선·상대 표시 보호).
        // 타 탭/다른 클라이언트에서 같은 userId 가 멈추면 아래에서 lastShown 기준으로 클리어.
        if (
          echoSuppressId != null &&
          typingUid === echoSuppressId &&
          typingSessionActiveRef.current
        ) {
          return;
        }
        if (
          lastShownTypingUserIdRef.current != null &&
          typingUid !== lastShownTypingUserIdRef.current
        ) {
          return;
        }
        cancelTypingStopDebounce();
        const uidForStop = typingUid;
        typingStopUiDebounceRef.current = window.setTimeout(() => {
          typingStopUiDebounceRef.current = null;
          if (lastShownTypingUserIdRef.current === uidForStop) {
            lastShownTypingUserIdRef.current = null;
            setRemoteTyping(null);
          }
        }, TYPING_STOP_UI_DEBOUNCE_MS);
        return;
      }

      const typingBubbleLabel = (nick: string) =>
        roomSnap?.isGroup ? `${nick.trim() || '상대방'}님이 입력 중...` : '입력 중...';
      const nick =
        parts.find((p) => Number(p.userId) === typingUid)?.nickname?.trim() ||
        opponentTypingNicknameRef.current?.trim() ||
        '상대방';

      const showRemoteTyping = () => {
        cancelTypingStopDebounce();
        lastShownTypingUserIdRef.current = typingUid;
        setRemoteTyping({ userId: typingUid, text: typingBubbleLabel(nick) });
        runTypingPollDebounced();
        // #region agent log
        debugAgentLogA7f850({
          runId: 'h-ui',
          hypothesisId: 'H-ui',
          location: 'useDmRoomStomp:showRemoteTyping',
          message: 'setRemoteTyping start',
          data: { rid, typingUid },
        });
        // #endregion
      };

      /** start 는 항상 반영 — 본인 에코는 DmChatPage 에서 `isMeTyping` 과 중복일 때만 숨김(에코 억제로 상대 타이핑까지 막히던 케이스 방지). */
      showRemoteTyping();
    };

    const onDmTopicMessage = (payloadBody: string) => {
      const typingEvts = parseAllInboundDmTypingEvents(payloadBody);
      if (
        typingEvts.length === 0 &&
        /"type"\s*:\s*"typing"/i.test(payloadBody.slice(0, 800))
      ) {
        // #region agent log
        debugAgentLogA7f850({
          runId: 'verify',
          hypothesisId: 'H-parseMiss',
          location: 'useDmRoomStomp:onDmTopicMessage',
          message: 'JSON mentions typing type but parseAllInbound returned 0 events',
          data: { rid, head: payloadBody.slice(0, 600) },
        });
        // #endregion
      }
      const newMsg = extractDmMessageFromStompBody(payloadBody);
      if (typingEvts.length > 0 && newMsg == null) {
        // #region agent log
        debugAgentLogA7f850({
          runId: 'verify',
          hypothesisId: 'H-typingOnly',
          location: 'useDmRoomStomp:onDmTopicMessage',
          message: 'typing-only stomp frame',
          data: { rid, evs: typingEvts },
        });
        // #endregion
      }
      typingEvts.forEach(applyTopicTyping);
      if (newMsg) {
        pruneShareBackupByServer(rid, [newMsg]);
        setIsLoading(false);
        /** `flushSync` 로 병합 직후 `appended` 를 확정 — 비순수 `queueMicrotask` 업데이터 대신 */
        let appendedInboundMessage = false;
        flushSync(() => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            appendedInboundMessage = true;
            const fp = dmMessageDedupeKey(newMsg);
            const withoutMatchingTemp = prev.filter(
              (m) => m.id >= 0 || dmMessageDedupeKey(m) !== fp
            );
            return [...withoutMatchingTemp, newMsg].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        });
        if (appendedInboundMessage) {
          const selfNow = effectiveSelfIdRef.current;
          const sid = toDmPositiveUserId(newMsg.senderId);
          if (isResolvedDmUserId(selfNow) && sid != null && sid !== selfNow) {
            sendReadEventRef.current(newMsg.id);
          }
          if (sid != null && lastShownTypingUserIdRef.current === sid) {
            clearRemoteTypingNow();
          }
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        } else {
          const sidDup = toDmPositiveUserId(newMsg.senderId);
          if (sidDup != null && lastShownTypingUserIdRef.current === sidDup) {
            // #region agent log
            debugAgentLogA7f850({
              runId: 'post-fix',
              hypothesisId: 'H-dup',
              location: 'useDmRoomStomp:onDmTopicMessage',
              message: 'skipped typing clear — duplicate stomp message id',
              data: { rid, messageId: newMsg.id },
            });
            // #endregion
          }
        }
        return;
      }

      if (typingEvts.length > 0) {
        return;
      }

      let parsedRoot: Record<string, unknown> | null = null;
      try {
        parsedRoot = coerceStompTopicEventRecord(parseDmWebSocketJson(payloadBody));
      } catch {
        return;
      }
      if (parsedRoot == null) return;

      const event = parsedRoot as unknown as WebSocketEventPayload<unknown>;
      const eventKind = resolveDmTopicEventKind(parsedRoot);
      switch (eventKind) {
        case 'message': {
          const fallbackMsg =
            parseWrappedDmMessageEvent(parsedRoot) ?? parseDmMessagePayload(event.data);
          if (!fallbackMsg) break;
          pruneShareBackupByServer(rid, [fallbackMsg]);
          setIsLoading(false);
          let appendedFallback = false;
          flushSync(() => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === fallbackMsg.id)) return prev;
              appendedFallback = true;
              const fp = dmMessageDedupeKey(fallbackMsg);
              const withoutMatchingTemp = prev.filter(
                (m) => m.id >= 0 || dmMessageDedupeKey(m) !== fp
              );
              return [...withoutMatchingTemp, fallbackMsg].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          });
          if (appendedFallback) {
            const selfNow2 = effectiveSelfIdRef.current;
            const sid2 = toDmPositiveUserId(fallbackMsg.senderId);
            if (isResolvedDmUserId(selfNow2) && sid2 != null && sid2 !== selfNow2) {
              sendReadEventRef.current(fallbackMsg.id);
            }
            if (sid2 != null && lastShownTypingUserIdRef.current === sid2) {
              clearRemoteTypingNow();
            }
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
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
        case 'typing': {
          const t2 = getTypingFieldsFromDmEvent(parsedRoot);
          if (t2) applyTopicTyping(t2);
          break;
        }
        default:
          break;
      }
    };

    const subscription = subscribeRef.current(dmStompTopic(rid), (frame) => {
      const payloadBody = stompMessageBodyToString(frame);
      if (!payloadBody) return;
      onDmTopicMessage(payloadBody);
    });

    const pollSoon = window.setTimeout(() => {
      fetchDmPollMergeIfStillInRoom(rid, roomIdRef, setMessages, {
        beforeMerge: (r, normalized) => pruneShareBackupByServer(r, normalized),
      });
    }, 250);

    return () => {
      cancelTypingStopDebounce();
      window.clearTimeout(flushTimer);
      window.clearTimeout(pollSoon);
      if (typingPollDebounceRef.current) {
        window.clearTimeout(typingPollDebounceRef.current);
        typingPollDebounceRef.current = null;
      }
      subscription?.unsubscribe();
      /**
       * STOMP 재연결(`reconnectKey`/토큰 리스캔)마다 effect 가 갱신되면 cleanup 이 매번 `setRemoteTyping(null)` 을 호출해
       * 상대 입력 말풍선이 즉시 지워지던 문제가 있음. 구독 해제 시점에 **URL 방 id 가 이 effect 의 rid 와 다를 때만** UI 초기화.
       */
      const refRaw = roomIdRef.current;
      const refNum =
        refRaw != null && refRaw !== '' && Number.isFinite(Number(refRaw)) ? Number(refRaw) : NaN;
      const stillThisRoom = Number.isFinite(refNum) && refNum === rid;
      if (!stillThisRoom) {
        clearRemoteTypingNow();
      }
    };
  }, [isConnected, roomId]);
}
