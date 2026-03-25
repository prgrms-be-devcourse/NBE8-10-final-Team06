// src/api/dm.ts
import client from './client';
import { RsData } from '../types/common';
import { 
  DmRoomSummaryResponse, 
  DmMessageSliceResponse 
} from '../types/dm';

export const dmApi = {
  // 내 채팅방 목록 조회
  getRooms: () => 
    client.get<RsData<DmRoomSummaryResponse[]>>('/dm/rooms').then(res => res.data),

  // 메시지 이력 조회 (Cursor 페이징)
  getMessages: (roomId: number, cursor?: number, size: number = 15) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor.toString());
    params.append('size', size.toString());
    
    return client.get<RsData<DmMessageSliceResponse>>(`/dm/rooms/${roomId}/messages?${params.toString()}`)
      .then(res => res.data);
  },

  // 1:1 채팅방 생성
  create1v1Room: (otherUserId: number) => 
    client.post<RsData<any>>(`/dm/rooms/1v1/${otherUserId}`).then(res => res.data),

  // 그룹 채팅방 생성
  createGroupRoom: (userIds: number[], name?: string) => 
    client.post<RsData<any>>('/dm/rooms/group', { userIds, name }).then(res => res.data),
};
