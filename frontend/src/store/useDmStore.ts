// src/store/useDmStore.ts
import { create } from 'zustand';
import { DmRoomSummaryResponse } from '../types/dm';

interface DmState {
  rooms: DmRoomSummaryResponse[];
  readRoomIds: Set<number>; // 읽은 것으로 간주할 방 ID 목록
  setRooms: (rooms: DmRoomSummaryResponse[]) => void;
  markAsRead: (roomId: number) => void;
}

export const useDmStore = create<DmState>((set) => ({
  rooms: [],
  readRoomIds: new Set<number>(),

  setRooms: (serverRooms) => set((state) => ({
    // 서버 데이터와 로컬 읽음 캐시 병합
    rooms: serverRooms.map(room => ({
      ...room,
      unreadCount: state.readRoomIds.has(room.roomId) ? 0 : room.unreadCount
    }))
  })),
  
  markAsRead: (roomId) => set((state) => {
    const newReadRoomIds = new Set(state.readRoomIds).add(roomId);
    return {
      readRoomIds: newReadRoomIds,
      rooms: state.rooms.map((room) => 
        room.roomId === roomId ? { ...room, unreadCount: 0 } : room
      )
    };
  }),
}));
