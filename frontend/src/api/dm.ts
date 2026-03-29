// src/api/dm.ts
import client from './client';
import { RsData } from '../types/common';
import { 
  DmRoomSummaryResponse, 
  DmMessageSliceResponse,
  DmCreate1v1WithRoomListResponse,
  DmCreateGroupWithRoomListResponse 
} from '../types/dm';

export const dmApi = {
  // 내 채팅방 목록 조회
  getRooms: () => 
    client.get<RsData<DmRoomSummaryResponse[]>>('/dm/rooms').then(res => res.data),

  // 메시지 이력 조회 (Cursor 페이징)
  getMessages: (roomId: number, cursor?: number, size: number = 15) => {
    const params = new URLSearchParams();
    if (cursor !== undefined && cursor !== null) {
      params.append('cursor', String(cursor));
    }
    params.append('size', size.toString());
    
    return client.get<RsData<DmMessageSliceResponse>>(`/dm/rooms/${roomId}/messages?${params.toString()}`)
      .then(res => res.data);
  },

  // 1:1 채팅방 생성
  create1v1Room: (otherUserId: number) => 
    client.post<RsData<DmCreate1v1WithRoomListResponse>>(`/dm/rooms/1v1/${otherUserId}`).then(res => res.data),

  // 그룹 채팅방 생성
  createGroupRoom: (userIds: number[], name?: string) => 
    client.post<RsData<DmCreateGroupWithRoomListResponse>>('/dm/rooms/group', { userIds, name }).then(res => res.data),

  // 1:1 채팅방 나가기 (방 삭제)
  leave1v1Room: (roomId: number) =>
    client.delete<RsData<string>>(`/dm/rooms/1v1/${roomId}`).then(res => res.data),

  // 그룹 채팅방 나가기
  leaveGroupRoom: (roomId: number) =>
    client.delete<RsData<string>>(`/dm/rooms/group/${roomId}`).then(res => res.data),
};
