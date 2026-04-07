// src/store/useDmStore.ts
import { create } from 'zustand';
import { DmRoomSummaryResponse } from '../types/dm';
import { sortDmRoomsByRecentMessage } from '../util/dmRoomSort';

interface DmState {
  rooms: DmRoomSummaryResponse[];
  readRoomIds: Set<number>; // 읽음 표시가 유효한 방 ID 목록(호환용)
  readAtByRoomId: Map<number, number>; // roomId -> 읽음 처리 시각(ms)
  setRooms: (rooms: DmRoomSummaryResponse[]) => void;
  markAsRead: (roomId: number) => void;
}

export const useDmStore = create<DmState>((set) => ({
  rooms: [],
  readRoomIds: new Set<number>(),
  readAtByRoomId: new Map<number, number>(),

  setRooms: (serverRooms) => set((state) => {
    const nextReadAtByRoomId = new Map(state.readAtByRoomId);
    const merged = serverRooms.map((room) => {
      const readAtMs = nextReadAtByRoomId.get(room.roomId);
      if (readAtMs == null) return room;

      const lastMessageAtMs = room.lastMessage?.createdAt
        ? Date.parse(room.lastMessage.createdAt)
        : Number.NaN;

      // 읽은 뒤 새 메시지가 오면 서버 unread 를 그대로 반영한다.
      const hasNewerMessage =
        Number.isFinite(lastMessageAtMs) ? lastMessageAtMs > readAtMs : room.unreadCount > 0;

      if (hasNewerMessage) {
        nextReadAtByRoomId.delete(room.roomId);
        return room;
      }

      return { ...room, unreadCount: 0 };
    });

    return {
      rooms: sortDmRoomsByRecentMessage(merged),
      readAtByRoomId: nextReadAtByRoomId,
      readRoomIds: new Set(nextReadAtByRoomId.keys()),
    };
  }),
  
  markAsRead: (roomId) => set((state) => {
    const nowMs = Date.now();
    const room = state.rooms.find((r) => r.roomId === roomId);
    const lastMessageAtMs = room?.lastMessage?.createdAt
      ? Date.parse(room.lastMessage.createdAt)
      : Number.NaN;
    const readAtMs = Number.isFinite(lastMessageAtMs) ? Math.max(nowMs, lastMessageAtMs) : nowMs;

    const nextReadAtByRoomId = new Map(state.readAtByRoomId).set(roomId, readAtMs);
    return {
      readAtByRoomId: nextReadAtByRoomId,
      readRoomIds: new Set(nextReadAtByRoomId.keys()),
      rooms: state.rooms.map((room) => 
        room.roomId === roomId ? { ...room, unreadCount: 0 } : room
      )
    };
  }),
}));
