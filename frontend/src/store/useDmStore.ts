// src/store/useDmStore.ts
import { create } from 'zustand';
import { DmRoomSummaryResponse } from '../types/dm';
import { sortDmRoomsByRecentMessage } from '../util/dmRoomSort';

interface DmState {
  rooms: DmRoomSummaryResponse[];
  /** 로컬에서 읽음 처리한 방 — 목록 unreadCount 를 0으로 덮어씀(PR#124 / develop 단순 모델) */
  readRoomIds: Set<number>;
  setRooms: (rooms: DmRoomSummaryResponse[]) => void;
  markAsRead: (roomId: number) => void;
}

export const useDmStore = create<DmState>((set) => ({
  rooms: [],
  readRoomIds: new Set<number>(),

  setRooms: (serverRooms) =>
    set((state) => {
      const merged = serverRooms.map((room) => ({
        ...room,
        unreadCount: state.readRoomIds.has(room.roomId) ? 0 : room.unreadCount,
      }));
      return { rooms: sortDmRoomsByRecentMessage(merged) };
    }),

  markAsRead: (roomId) =>
    set((state) => {
      const newReadRoomIds = new Set(state.readRoomIds).add(roomId);
      return {
        readRoomIds: newReadRoomIds,
        rooms: state.rooms.map((room) =>
          room.roomId === roomId ? { ...room, unreadCount: 0 } : room,
        ),
      };
    }),
}));
