/**
 * DM 방 `/topic/dm.{roomId}` 단일 구독.
 *
 * 백엔드 계약 (DmWebSocketController):
 * - 브로드캐스트: `/topic/dm.{roomId}`
 * - `message` → WebSocketEventPayload: `{ type: "message", data: DmMessageResponse }`
 * - `read` → `{ type: "read", messageId }`
 * - `typing` → 평면 `{ type, roomId, userId, status }`
 * - `join` / `leave` → UI 미사용
 *
 * 송신은 페이지에서 `/app/dm/{roomId}/message` + DmSendMessageRequest (type, content, thumbnail).
 * WS 가 메시지를 놓치는 환경에서는 DmChatPage 의 REST 폴링·전송 직후 sync 로 보완한다.
 */

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { IMessage } from '@stomp/stompjs';
import { useDmStore } from '../store/useDmStore';
import { takePendingDmBatch } from '../services/dmPendingSend';
import { persistShareBackup, pruneShareBackupByServer } from '../services/dmSharePersistence';
import type { DmMessageResponse, DmMessageSliceResponse } from '../types/dm';
import { isResolvedDmUserId, toDmPositiveUserId } from '../util/dmMessageDedupe';
import { readJwtSubAsUserId } from '../util/jwtUserId';
import { fetchDmFirstPageIfStillInRoom, fetchDmPollMergeIfStillInRoom, type DmRoomIdRef } from '../util/dmRoomServerReconcile';
import {
  mergePendingStompBatchIntoUiMessages,
  mergeRealtimeDmMessageIntoList,
} from '../util/dmMessagesMerge';
import {
  buildDmStompMessageBody,
  dmStompAppMessage,
  dmStompTopic,
} from '../util/dmStompDestinations';
import {
  parseBackendDmMessageFromTopicBody,
  parseBackendReadFromTopicBody,
  stompMessageBodyToString,
} from '../util/dmWebSocketPayload';
import { parseAllInboundDmTypingEvents } from '../util/dmTypingInbound';

export type UseDmRoomTopicParams = {
  roomId: string | undefined;
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => { unsubscribe: () => void } | undefined;
  publish: (destination: string, body: unknown) => void;
  effectiveSelfIdRef: MutableRefObject<number | null>;
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
  opponentTypingNicknameRef: MutableRefObject<string | null>;
  typingSessionActiveRef: MutableRefObject<boolean>;
};

export function useDmRoomTopic(p: UseDmRoomTopicParams): void {
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

  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const mergeFreshRef = useRef(mergeFreshSliceIntoMessages);
  mergeFreshRef.current = mergeFreshSliceIntoMessages;

  const lastShownTypingUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isConnected || !roomId) {
      return () => {};
    }
    const rid = Number(roomId);

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
      setMessages((prev) => mergePendingStompBatchIntoUiMessages(prev, batch, actorId));

      const dest = dmStompAppMessage(rid);
      batch.forEach((pl) => {
        publishRef.current(dest, buildDmStompMessageBody(pl));
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
        /** 지연 해제 시 그 사이 도착한 `start` 가 디바운스를 취소해 입력 종료 후에도 말풍선이 다시 켜질 수 있음 → 즉시 해제 */
        clearRemoteTypingNow();
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
      };

      showRemoteTyping();
    };

    const onTopicFrame = (payloadBody: string) => {
      parseAllInboundDmTypingEvents(payloadBody).forEach(applyTopicTyping);

      const newMsg = parseBackendDmMessageFromTopicBody(payloadBody);
      if (newMsg) {
        pruneShareBackupByServer(rid, [newMsg]);
        setIsLoading(false);
        let isNew = false;
        flushSync(() => {
          setMessages((prev) => {
            const { next, isNewServerMessage } = mergeRealtimeDmMessageIntoList(prev, newMsg);
            isNew = isNewServerMessage;
            return next;
          });
        });
        if (isNew) {
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
        }
      }

      const readId = parseBackendReadFromTopicBody(payloadBody);
      if (readId != null) {
        setLastReadIdByOpponent((prev) => Math.max(prev, readId));
      }
    };

    const topicDest = dmStompTopic(rid);
    const subscription = subscribeRef.current(topicDest, (frame) => {
      const payloadBody = stompMessageBodyToString(frame);
      if (!payloadBody) return;
      onTopicFrame(payloadBody);
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
