import type { Dispatch, SetStateAction } from 'react';
import { dmApi } from '../api/dm';
import type { DmMessageResponse, DmMessageSliceResponse } from '../types/dm';
import { normalizeDmMessagesFromApi } from './dmMessageDedupe';
import { mergePollSliceIntoMessages } from './dmMessagesMerge';
import { isRsSuccess } from './rsData';

export type DmRoomIdRef = { current: string | undefined };

/**
 * 현재 방이 `rid`일 때만 첫 페이지를 가져와 병합 콜백에 넘긴다.
 * STOMP 실시간 수신 후·전송 직후·타이핑 디바운스 등에서 중복되는 패턴을 한곳으로 모은다.
 */
export function fetchDmFirstPageIfStillInRoom(
  rid: number,
  roomIdRef: DmRoomIdRef,
  onSlice: (slice: DmMessageSliceResponse) => void,
  options?: {
    onNormalized?: (normalized: DmMessageResponse[]) => void;
    /** true 이면 응답을 적용하지 않음 (예: 방 전환 세대) */
    abortIf?: () => boolean;
  }
): void {
  if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
  void dmApi.getMessages(rid).then((res) => {
    if (options?.abortIf?.()) return;
    if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
    if (!isRsSuccess(res.resultCode) || !res.data) return;
    const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
    options?.onNormalized?.(normalized);
    onSlice(res.data);
  });
}

/** 폴링·타이핑 디바운스용: 첫 페이지를 가져와 `mergePollSliceIntoMessages` 로 합친다. */
export function fetchDmPollMergeIfStillInRoom(
  rid: number,
  roomIdRef: DmRoomIdRef,
  setMessages: Dispatch<SetStateAction<DmMessageResponse[]>>,
  options?: {
    onNormalized?: (normalized: DmMessageResponse[]) => void;
    beforeMerge?: (rid: number, normalized: DmMessageResponse[]) => void;
    /** API 기준 최신이 앞 — 시간순 배열 */
    afterMerge?: (incomingChronological: DmMessageResponse[]) => void;
  }
): void {
  if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
  void dmApi.getMessages(rid).then((res) => {
    if (roomIdRef.current == null || Number(roomIdRef.current) !== rid) return;
    if (!isRsSuccess(res.resultCode) || !res.data) return;
    const normalized = normalizeDmMessagesFromApi(res.data.messages ?? []);
    options?.onNormalized?.(normalized);
    options?.beforeMerge?.(rid, normalized);
    const incoming = [...normalized].reverse();
    setMessages((prev) => mergePollSliceIntoMessages(prev, incoming));
    options?.afterMerge?.(incoming);
  });
}
